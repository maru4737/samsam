import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const port = process.env.PORT || '4173';
const webSocketUrl = process.env.WS_URL || `ws://127.0.0.1:${port}/ws`;
const source = JSON.parse(await readFile(new URL('../dist/assets/questions.json', import.meta.url), 'utf8'));
const questionByImage = new Map(source.items.map((item) => [item.image, item]));

function createClient() {
  const socket = new WebSocket(webSocketUrl);
  const inbox = [];
  const waiters = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    inbox.push(message);
    for (const waiter of [...waiters]) {
      if (waiter.match(message)) { waiters.splice(waiters.indexOf(waiter), 1); clearTimeout(waiter.timer); waiter.resolve(message); }
    }
  });
  return {
    socket,
    ready: new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); }),
    send(value) { socket.send(JSON.stringify({ requestId: crypto.randomUUID(), ...value })); },
    wait(match, timeout = 8000, from = 0) {
      const found = inbox.slice(from).find(match);
      if (found) return Promise.resolve(found);
      return new Promise((resolve, reject) => {
        const waiter = { match, resolve };
        waiters.push(waiter);
        waiter.timer = setTimeout(() => { const index = waiters.indexOf(waiter); if (index >= 0) { waiters.splice(index, 1); reject(new Error('Timed out waiting for server event')); } }, timeout);
      });
    },
    next(match, timeout = 8000) { return this.wait(match, timeout, inbox.length); },
    close() { socket.close(); }
  };
}

const host = createClient();
const guest = createClient();
const otherGuest = createClient();
try {
await Promise.all([host.ready, guest.ready, otherGuest.ready]);
host.send({ type: 'room.create', nickname: '민수', settings: { category: 'object', personCategory: 'person', roundCount: 5 } });
const hostSession = await host.wait((event) => event.type === 'session');
const hostRoom = await host.wait((event) => event.type === 'room.snapshot').then((event) => event.room);
const expectBlockedStart = async () => {
  const blocked = host.next((event) => event.type === 'error' && event.code === 'NOT_READY');
  host.send({ type: 'match.start', roomCode: hostSession.roomCode });
  await blocked;
};
const participantsReady = (room) => room.players.every((player) => player.id === room.hostPlayerId || player.ready);
await expectBlockedStart(); // The host still needs at least one other participant.
guest.send({ type: 'room.join', roomCode: hostSession.roomCode, nickname: '지수' });
await guest.wait((event) => event.type === 'session');
await host.wait((event) => event.type === 'room.snapshot' && event.room.players.length === 2);
otherGuest.send({ type: 'room.join', roomCode: hostSession.roomCode, nickname: '영희' });
await otherGuest.wait((event) => event.type === 'session');
await host.wait((event) => event.type === 'room.snapshot' && event.room.players.length === 3);
await expectBlockedStart(); // Joining alone does not mark the guest ready.
const guestCannotStart = guest.next((event) => event.type === 'error' && event.code === 'NOT_HOST');
guest.send({ type: 'match.start', roomCode: hostSession.roomCode });
await guestCannotStart;
guest.send({ type: 'player.ready', roomCode: hostSession.roomCode, ready: true });
await host.wait((event) => event.type === 'room.snapshot' && event.room.players.some((player) => player.ready));
await expectBlockedStart(); // Every guest must be ready, not just the first one.
otherGuest.send({ type: 'player.ready', roomCode: hostSession.roomCode, ready: true });
const initiallyReady = (await host.wait((event) => event.type === 'room.snapshot' && event.room.players.length === 3 && participantsReady(event.room))).room;
assert.equal(initiallyReady.players.find((player) => player.id === hostSession.playerId).ready, false);
const settingsReset = host.next((event) => event.type === 'room.snapshot' && !participantsReady(event.room));
host.send({ type: 'room.settings', roomCode: hostSession.roomCode, settings: { category: 'object', roundCount: 5 } });
await settingsReset;
await expectBlockedStart(); // Changed settings require the guests to confirm again.
const guestsReadyAgain = host.next((event) => event.type === 'room.snapshot' && participantsReady(event.room));
guest.send({ type: 'player.ready', roomCode: hostSession.roomCode, ready: true });
otherGuest.send({ type: 'player.ready', roomCode: hostSession.roomCode, ready: true });
await guestsReadyAgain;
host.send({ type: 'match.start', roomCode: hostSession.roomCode });
const snapshot = (state, matchId) => (event) => event.type === 'room.snapshot' && event.room.state === state && (!matchId || event.room.match?.id === matchId);
const preparing = (await host.wait(snapshot('preparing'))).room;
assert.equal(preparing.players.find((player) => player.id === hostSession.playerId).ready, false);
console.log('PASS: only guests need ready; host-only, unready-guest and non-host starts rejected');
assert.equal(preparing.match.targetRounds, 5);
assert.equal(preparing.match.preloadImages.length, 5);
assert.equal(preparing.match.image, null);
assert.equal(preparing.match.deadline, null);
assert.equal(preparing.countdownEndsAt, null);
const confirm = (client, match, failedImages = []) => client.send({ type: 'match.prepared', roomCode: hostSession.roomCode, matchId: match.id, preloadVersion: match.preloadVersion, failedImages });
const sync = async () => {
  const next = host.next((event) => event.type === 'room.snapshot');
  host.send({ type: 'room.sync', roomCode: hostSession.roomCode });
  return (await next).room;
};
confirm(host, preparing.match);
confirm(otherGuest, preparing.match);
await host.wait((event) => snapshot('preparing')(event) && event.room.players.some((player) => player.imagesReady));
// A client taking longer than the old five-second countdown must not lose playing time.
await delay(6200);
const waiting = await sync();
assert.equal(waiting.state, 'preparing');
assert.equal(waiting.match.roundIndex, 0);
assert.equal(waiting.match.deadline, null);
console.log('PASS: slow participant holds the entire match before countdown');

const brokenImage = preparing.match.preloadImages[0];
confirm(guest, preparing.match, [brokenImage]);
const replaced = (await host.wait((event) => snapshot('preparing')(event) && event.room.match.preloadVersion === 2)).room;
assert.equal(replaced.match.preloadImages.length, 5);
assert.ok(!replaced.match.preloadImages.includes(brokenImage));
assert.ok(replaced.players.every((player) => !player.imagesReady));
for (const image of preparing.match.preloadImages.slice(1)) assert.ok(replaced.match.preloadImages.includes(image));
confirm(host, preparing.match); // Stale version cannot acknowledge the replacement deck.
confirm(host, { ...replaced.match, id: 'old-match' });
confirm(host, replaced.match, ['unknown-image']);
assert.ok((await sync()).players.every((player) => !player.imagesReady));
confirm(host, replaced.match);
confirm(guest, replaced.match);
assert.equal((await sync()).state, 'preparing');
confirm(otherGuest, replaced.match);
const countdown = (await host.wait(snapshot('countdown'))).room;
assert.ok(countdown.players.every((player) => player.imagesReady));
assert.equal(countdown.match.deadline, null);
assert.ok(countdown.countdownEndsAt > countdown.serverNow);
console.log('PASS: failed photo replaced for everyone; stale confirmations ignored');

for (let round = 1; round <= 5; round += 1) {
  const active = (await host.wait((event) => snapshot('active')(event) && event.room.match.roundIndex === round)).room;
  assert.equal(active.match.deadline - active.match.opensAt, 5000);
  assert.ok(active.match.opensAt <= active.serverNow, 'No artificial per-question loading delay');
  const question = questionByImage.get(active.match.image);
  assert.ok(question);
  if (round === 1) {
    const chatText = '이건 뭐지?';
    const chatSnapshot = host.next((event) => snapshot('active')(event) && event.room.match.roundIndex === round && event.room.match.chat.some((message) => message.text === chatText));
    guest.send({ type: 'chat.send', roomCode: hostSession.roomCode, matchId: active.match.id, roundId: active.match.roundId, text: chatText });
    const chatted = (await chatSnapshot).room;
    const message = chatted.match.chat.find((entry) => entry.text === chatText);
    assert.equal(message.kind, 'chat');
    assert.equal(message.nickname, '지수');
  }
  const answer = { type: 'chat.send', roomCode: hostSession.roomCode, matchId: active.match.id, roundId: active.match.roundId, text: question.answer };
  host.send(answer); guest.send(answer);
  const resolved = (await host.wait((event) => snapshot('reveal')(event) && event.room.match.roundIndex === round)).room;
  assert.equal(resolved.players.reduce((sum, player) => sum + player.score, 0), round);
  assert.ok(resolved.match.winnerPlayerId);
  assert.equal(resolved.match.answer, question.answer);
  assert.ok(resolved.match.chat.some((message) => message.text === question.answer && message.kind === 'correct'));
}
const finished = (await host.wait(snapshot('finished'))).room;
assert.equal(finished.match.results.length, 5);
assert.equal(finished.players.reduce((sum, player) => sum + player.totalCorrect, 0), 5);
console.log('PASS: all five prepared rounds open immediately, each awards one point');

const lobby = host.next(snapshot('lobby'));
host.send({ type: 'match.rematch', roomCode: hostSession.roomCode });
await lobby;
const ready = host.next((event) => snapshot('lobby')(event) && participantsReady(event.room));
guest.send({ type: 'player.ready', roomCode: hostSession.roomCode, ready: true });
otherGuest.send({ type: 'player.ready', roomCode: hostSession.roomCode, ready: true });
await ready;
const rematchPreparing = host.next(snapshot('preparing'));
host.send({ type: 'match.start', roomCode: hostSession.roomCode });
const rematch = (await rematchPreparing).room;
assert.notEqual(rematch.match.id, preparing.match.id);
confirm(host, replaced.match);
assert.ok((await sync()).players.every((player) => !player.imagesReady));

if (process.env.TEST_PRELOAD_TIMEOUT === '1') {
  const timedOut = (await host.next(snapshot('lobby'), 65000)).room;
  assert.equal(timedOut.match, null);
  assert.ok(timedOut.players.every((player) => !player.ready));
  console.log('PASS: preparation timeout safely returns everyone to lobby');
} else {
  const cancelled = host.next(snapshot('lobby'));
  guest.close();
  const returned = (await cancelled).room;
  assert.equal(returned.match, null);
  assert.ok(returned.players.every((player) => !player.ready));
  console.log('PASS: disconnect during preparation cancels safely; rematch ignores old acknowledgments');
}
console.log(JSON.stringify({ room: hostRoom.code, result: 'passed' }));
} finally {
  host.close(); guest.close(); otherGuest.close();
}
