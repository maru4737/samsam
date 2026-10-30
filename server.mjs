import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT || 8080);
const ROOT = resolve(process.cwd(), 'dist');
const QUESTIONS_PATH = join(ROOT, 'assets/questions.json');
const REPORTS_PATH = process.env.REPORTS_PATH || resolve(process.cwd(), 'data', 'reports.jsonl');
const DEFAULT_ROUND_SIZE = 10;
const ROUND_OPTIONS = new Set([5, 10, 15, 20]);
const ROUND_MS = 5000;
const REVEAL_MS = 1500;
const START_COUNTDOWN_MS = 5000;
const PRELOAD_TIMEOUT_MS = 60000;
const RECONNECT_GRACE_MS = 30000;
const ROOM_IDLE_MS = 30 * 60 * 1000;
const MAX_PLAYERS = 8;
const rooms = new Map();
const peers = new Set();
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

let questions = [];
try {
  questions = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8')).items.filter((item) => item.reviewed);
} catch (error) {
  console.error('Unable to load question data', error);
  process.exit(1);
}
mkdirSync(resolve(REPORTS_PATH, '..'), { recursive: true });

const normalizeAnswer = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s·._-]/g, '');
const cleanNickname = (value) => {
  const text = String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '');
  return Array.from(text).length >= 1 && Array.from(text).length <= 12 ? text : null;
};
const cleanChatText = (value) => {
  const text = String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '');
  return Array.from(text).length >= 1 && Array.from(text).length <= 120 ? text : null;
};
const cleanCode = (value) => String(value || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
const id = () => randomUUID();
const token = () => randomBytes(24).toString('base64url');
const shuffle = (items) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function getQuestionPool(settings) {
  const people = new Set(['korean', 'global', 'character']);
  if (settings.category === 'object') return questions.filter((item) => item.gameGroup === 'object');
  if (settings.category === 'mixed') return [...questions];
  if (settings.personCategory && settings.personCategory !== 'person') return questions.filter((item) => item.gameGroup === settings.personCategory);
  return questions.filter((item) => people.has(item.gameGroup));
}

function validateSettings(input = {}) {
  const category = ['person', 'object', 'mixed'].includes(input.category) ? input.category : 'person';
  const personCategory = ['person', 'korean', 'global', 'character'].includes(input.personCategory) ? input.personCategory : 'person';
  const roundCount = ROUND_OPTIONS.has(Number(input.roundCount)) ? Number(input.roundCount) : DEFAULT_ROUND_SIZE;
  return { category, personCategory: category === 'person' ? personCategory : 'person', roundCount };
}

function buildQueue(settings) {
  const pool = getQuestionPool(settings);
  if (pool.length < settings.roundCount) return null;
  return shuffle(pool.map((item) => item.id)).slice(0, settings.roundCount);
}

function questionById(questionId) {
  return questions.find((item) => item.id === questionId) || null;
}

function readRequestJson(request, maxBytes = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0; let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > maxBytes) { reject(new Error('too large')); request.destroy(); return; }
      body += chunk;
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('invalid json')); }
    });
    request.on('error', reject);
  });
}

function saveQuestionReport(input) {
  const question = questionById(input?.questionId);
  const source = input?.source === 'battle' ? 'battle' : input?.source === 'single' ? 'single' : null;
  if (!question || !source) return null;
  const report = { id: id(), reportedAt: new Date().toISOString(), source, questionId: question.id, answer: question.answer, accepted: question.accepted || [], gameGroup: question.gameGroup, image: question.image };
  appendFileSync(REPORTS_PATH, `${JSON.stringify(report)}\n`, { encoding: 'utf8', mode: 0o600 });
  return report;
}

function playerPublic(player, room) {
  return {
    id: player.id,
    nickname: player.nickname,
    ready: player.ready,
    imagesReady: Boolean(room.match?.preparedPlayers.has(player.id)),
    connected: Boolean(player.peer),
    score: room.match?.scores[player.id] || 0,
    totalCorrect: player.totalCorrect || 0,
    matchWins: player.matchWins || 0,
    leftMatch: player.leftMatch
  };
}

function winnersFor(room) {
  if (!room.match) return [];
  const active = [...room.players.values()].filter((player) => !player.leftMatch);
  const max = Math.max(0, ...active.map((player) => room.match.scores[player.id] || 0));
  return max === 0 ? [] : active.filter((player) => (room.match.scores[player.id] || 0) === max).map((player) => player.id);
}

function publicSnapshot(room) {
  const match = room.match;
  const current = match?.current;
  const preloadImages = match ? [current?.question, ...match.queue.map(questionById)].filter(Boolean).map((question) => question.image) : [];
  const state = {
    code: room.code,
    state: room.state,
    hostPlayerId: room.hostPlayerId,
    settings: room.settings,
    players: [...room.players.values()].map((player) => playerPublic(player, room)),
    version: room.version,
    serverNow: Date.now(),
    countdownEndsAt: room.countdownEndsAt || null,
    match: match ? {
      id: match.id,
      roundIndex: match.roundIndex,
      targetRounds: match.roundLimit,
      phase: room.state,
      roundId: current?.id || null,
      opensAt: current?.opensAt || null,
      deadline: current?.deadline || null,
      revealEndsAt: current?.revealEndsAt || null,
      image: current ? current.question.image : null,
      questionId: current ? current.question.id : null,
      preloadImages,
      preloadVersion: match.preloadVersion,
      chat: match.chat,
      answer: room.state === 'reveal' || room.state === 'finished' ? current?.question.answer || null : null,
      winnerPlayerId: room.state === 'reveal' ? current?.winnerPlayerId || null : null,
      winners: room.state === 'finished' ? winnersFor(room) : [],
      results: room.state === 'finished' ? match.results : undefined
    } : null
  };
  return state;
}

function message(peer, payload) {
  if (peer?.alive) peer.send(JSON.stringify(payload));
}

function broadcast(room) {
  room.version += 1;
  const snapshot = { type: 'room.snapshot', room: publicSnapshot(room) };
  for (const player of room.players.values()) message(player.peer, snapshot);
}

function directSnapshot(peer, room) {
  message(peer, { type: 'room.snapshot', room: publicSnapshot(room) });
}

function roomError(peer, code, messageText, requestId = null) {
  message(peer, { type: 'error', code, message: messageText, requestId });
}

function setRoomTimer(room, delay, callback) {
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    room.timer = null;
    callback();
  }, Math.max(0, delay));
}

function clearRoomTimers(room) {
  clearTimeout(room.timer);
  clearTimeout(room.idleTimer);
  room.timer = null;
  room.idleTimer = null;
}

function bumpActivity(room) {
  room.lastActivityAt = Date.now();
  clearTimeout(room.idleTimer);
  if (room.state === 'lobby' || room.state === 'finished') {
    room.idleTimer = setTimeout(() => closeRoom(room, '오랫동안 활동이 없어 방을 닫았어요.'), ROOM_IDLE_MS);
  }
}

function closeRoom(room, reason) {
  if (!rooms.has(room.code)) return;
  clearRoomTimers(room);
  for (const player of room.players.values()) message(player.peer, { type: 'room.closed', message: reason });
  rooms.delete(room.code);
}

function transferHost(room) {
  if (room.hostPlayerId && room.players.has(room.hostPlayerId)) return;
  const next = [...room.players.values()].find((player) => player.peer) || room.players.values().next().value;
  room.hostPlayerId = next?.id || null;
}

function connectedPlayers(room) {
  return [...room.players.values()].filter((player) => player.peer && !player.leftMatch);
}

function resetReady(room) {
  for (const player of room.players.values()) player.ready = false;
}

function cancelMatch(room, reason) {
  clearTimeout(room.timer);
  room.state = 'lobby';
  room.countdownEndsAt = null;
  room.match = null;
  resetReady(room);
  bumpActivity(room);
  broadcast(room);
  for (const player of room.players.values()) message(player.peer, { type: 'notice', message: reason });
}

function startMatch(room) {
  const queue = buildQueue(room.settings);
  if (!queue) return false;
  room.state = 'preparing';
  room.countdownEndsAt = null;
  room.match = { id: id(), roundIndex: 0, roundLimit: room.settings.roundCount, queue, preloadVersion: 1, preparedPlayers: new Set(), attemptedIds: new Set(queue), scores: Object.fromEntries([...room.players.values()].map((player) => [player.id, 0])), results: [], chat: [], current: null };
  bumpActivity(room);
  broadcast(room);
  setRoomTimer(room, PRELOAD_TIMEOUT_MS, () => cancelMatch(room, '사진 준비가 오래 걸려 대기실로 돌아왔어요. 연결을 확인하고 다시 준비해 주세요.'));
  return true;
}

function confirmImagesPrepared(room, player, payload) {
  const match = room.match;
  if (room.state !== 'preparing' || !match || payload.matchId !== match.id || payload.preloadVersion !== match.preloadVersion || match.preparedPlayers.has(player.id)) return;
  if (!Array.isArray(payload.failedImages) || payload.failedImages.length > match.queue.length) return;
  const sources = new Set(match.queue.map((questionId) => questionById(questionId).image));
  if (payload.failedImages.some((source) => !sources.has(source))) return;
  const failed = new Set(payload.failedImages);
  if (failed.size) {
    // Everyone receives the same replacement deck and acknowledges its new version.
    const replacements = shuffle(getQuestionPool(room.settings).filter((question) => !match.attemptedIds.has(question.id) && !failed.has(question.image)));
    const replacementQueue = [];
    for (const questionId of match.queue) {
      if (!failed.has(questionById(questionId).image)) { replacementQueue.push(questionId); continue; }
      const replacement = replacements.pop();
      if (!replacement) return cancelMatch(room, '사진을 준비하지 못했어요. 연결을 확인하거나 다른 항목을 선택해 주세요.');
      match.attemptedIds.add(replacement.id);
      replacementQueue.push(replacement.id);
    }
    match.queue = replacementQueue;
    match.preloadVersion += 1;
    match.preparedPlayers.clear();
    broadcast(room);
    return;
  }
  match.preparedPlayers.add(player.id);
  const players = [...room.players.values()];
  if (players.length >= 2 && players.every((candidate) => candidate.peer && match.preparedPlayers.has(candidate.id))) {
    room.state = 'countdown';
    room.countdownEndsAt = Date.now() + START_COUNTDOWN_MS;
    setRoomTimer(room, START_COUNTDOWN_MS, () => startNextRound(room));
  }
  broadcast(room);
}

function startNextRound(room) {
  if (!rooms.has(room.code) || !room.match) return;
  if (connectedPlayers(room).length < 2) return cancelMatch(room, '참가자가 부족해 대결을 취소했어요.');
  if (room.match.roundIndex >= room.match.roundLimit) return finishMatch(room);
  const questionId = room.match.queue.shift();
  const question = questionById(questionId);
  if (!question) return startNextRound(room);
  const now = Date.now();
  room.state = 'active';
  room.match.roundIndex += 1;
  room.match.current = { id: id(), question, opensAt: now, deadline: now + ROUND_MS, winnerPlayerId: null, revealEndsAt: null };
  broadcast(room);
  setRoomTimer(room, room.match.current.deadline - Date.now() + 10, () => resolveRound(room, null));
}

function sendChat(room, player, payload) {
  const match = room.match;
  const text = cleanChatText(payload.text);
  if (!match || !['countdown', 'active', 'reveal'].includes(room.state)) return { error: ['CHAT_UNAVAILABLE', '채팅을 보낼 수 없는 상태예요.'] };
  if (!text) return { error: ['INVALID_INPUT', '채팅을 다시 입력해 주세요.'] };
  const current = match.current;
  const now = Date.now();
  const answerWindow = room.state === 'active' && current && payload.matchId === match.id && payload.roundId === current.id && now >= current.opensAt && now < current.deadline;
  const validAnswers = answerWindow ? [current.question.answer, ...(current.question.accepted || [])].map(normalizeAnswer) : [];
  const correct = validAnswers.includes(normalizeAnswer(text));
  match.chat.push({ id: id(), playerId: player.id, nickname: player.nickname, text, kind: correct ? 'correct' : 'chat', roundId: current?.id || null, createdAt: now });
  if (match.chat.length > 80) match.chat.shift();
  if (correct) resolveRound(room, player.id);
  else broadcast(room);
  return { correct };
}

function resolveRound(room, winnerPlayerId) {
  const match = room.match;
  if (!match?.current || room.state !== 'active') return;
  clearTimeout(room.timer);
  const current = match.current;
  current.winnerPlayerId = winnerPlayerId;
  current.revealEndsAt = Date.now() + REVEAL_MS;
  if (winnerPlayerId) {
    match.scores[winnerPlayerId] = (match.scores[winnerPlayerId] || 0) + 1;
    const winner = room.players.get(winnerPlayerId); if (winner) winner.totalCorrect = (winner.totalCorrect || 0) + 1;
  }
  match.results.push({ roundIndex: match.roundIndex, answer: current.question.answer, winnerPlayerId });
  room.state = 'reveal';
  broadcast(room);
  setRoomTimer(room, REVEAL_MS, () => {
    if (match.roundIndex >= match.roundLimit) finishMatch(room);
    else startNextRound(room);
  });
}

function finishMatch(room) {
  if (!room.match) return;
  clearTimeout(room.timer);
  for (const winnerId of winnersFor(room)) {
    const winner = room.players.get(winnerId); if (winner) winner.matchWins = (winner.matchWins || 0) + 1;
  }
  room.state = 'finished';
  room.match.current = room.match.current || null;
  bumpActivity(room);
  broadcast(room);
}

function readyToStart(room) {
  const players = [...room.players.values()];
  return players.length >= 2 && players.length <= MAX_PLAYERS && players.every((player) => player.peer && (player.id === room.hostPlayerId || player.ready));
}

function leaveRoom(room, player, reason = null) {
  if (!room.players.has(player.id)) return;
  room.players.delete(player.id);
  if (room.match) player.leftMatch = true;
  transferHost(room);
  if (!room.players.size) return closeRoom(room, '방을 닫았어요.');
  if (room.state === 'preparing' || room.state === 'countdown') return cancelMatch(room, '참가자가 나가 대기실로 돌아왔어요. 다시 준비해 주세요.');
  if (room.state === 'active' || room.state === 'reveal') {
    if (connectedPlayers(room).length < 2) return cancelMatch(room, '참가자가 부족해 대결을 취소했어요.');
  }
  resetReady(room);
  bumpActivity(room);
  broadcast(room);
  if (reason) for (const candidate of room.players.values()) message(candidate.peer, { type: 'notice', message: reason });
}

function playerFromMessage(peer, payload) {
  const room = rooms.get(cleanCode(payload.roomCode));
  if (!room) return { error: ['ROOM_NOT_FOUND', '방을 찾을 수 없어요.'] };
  const player = room.players.get(peer.playerId);
  if (!player || player.token !== peer.token) return { error: ['INVALID_SESSION', '참가 정보가 만료됐어요.'] };
  return { room, player };
}

function handleMessage(peer, raw) {
  let payload;
  try { payload = JSON.parse(raw); } catch { return roomError(peer, 'INVALID_INPUT', '올바르지 않은 요청이에요.'); }
  if (!payload || typeof payload.type !== 'string') return roomError(peer, 'INVALID_INPUT', '올바르지 않은 요청이에요.', payload?.requestId);
  const requestId = typeof payload.requestId === 'string' ? payload.requestId.slice(0, 80) : null;

  if (payload.type === 'room.create') {
    const nickname = cleanNickname(payload.nickname);
    if (!nickname) return roomError(peer, 'INVALID_NICKNAME', '닉네임은 1~12자로 입력해 주세요.', requestId);
    const room = {
      code: makeRoomCode(), hostPlayerId: null, state: 'lobby', settings: validateSettings(payload.settings), players: new Map(),
      match: null, version: 0, timer: null, idleTimer: null, countdownEndsAt: null, lastActivityAt: Date.now()
    };
    const player = { id: id(), token: token(), nickname, peer, ready: false, leftMatch: false, totalCorrect: 0, matchWins: 0, disconnectTimer: null };
    room.hostPlayerId = player.id;
    room.players.set(player.id, player);
    rooms.set(room.code, room);
    peer.roomCode = room.code; peer.playerId = player.id; peer.token = player.token;
    bumpActivity(room);
    message(peer, { type: 'session', roomCode: room.code, playerId: player.id, sessionToken: player.token });
    directSnapshot(peer, room);
    return;
  }

  if (payload.type === 'room.join') {
    const room = rooms.get(cleanCode(payload.roomCode));
    const nickname = cleanNickname(payload.nickname);
    if (!room) return roomError(peer, 'ROOM_NOT_FOUND', '방 코드를 다시 확인해 주세요.', requestId);
    if (room.state !== 'lobby' && room.state !== 'finished') return roomError(peer, 'MATCH_IN_PROGRESS', '진행 중인 방에는 새로 들어올 수 없어요.', requestId);
    if (!nickname) return roomError(peer, 'INVALID_NICKNAME', '닉네임은 1~12자로 입력해 주세요.', requestId);
    if (room.players.size >= MAX_PLAYERS) return roomError(peer, 'ROOM_FULL', '방 인원이 모두 찼어요.', requestId);
    if ([...room.players.values()].some((player) => player.nickname === nickname)) return roomError(peer, 'DUPLICATE_NICKNAME', '같은 닉네임이 이미 있어요.', requestId);
    const player = { id: id(), token: token(), nickname, peer, ready: false, leftMatch: false, totalCorrect: 0, matchWins: 0, disconnectTimer: null };
    room.players.set(player.id, player);
    peer.roomCode = room.code; peer.playerId = player.id; peer.token = player.token;
    resetReady(room); bumpActivity(room);
    message(peer, { type: 'session', roomCode: room.code, playerId: player.id, sessionToken: player.token });
    broadcast(room);
    return;
  }

  if (payload.type === 'room.reconnect') {
    const room = rooms.get(cleanCode(payload.roomCode));
    const player = room && [...room.players.values()].find((candidate) => candidate.id === payload.playerId && candidate.token === payload.sessionToken);
    if (!room || !player) return roomError(peer, 'INVALID_SESSION', '방 참가 정보가 만료됐어요.', requestId);
    if (player.peer && player.peer !== peer) message(player.peer, { type: 'session.replaced', message: '다른 탭에서 다시 연결했어요.' });
    clearTimeout(player.disconnectTimer);
    player.peer = peer; player.leftMatch = false;
    peer.roomCode = room.code; peer.playerId = player.id; peer.token = player.token;
    bumpActivity(room); broadcast(room);
    return;
  }

  const result = playerFromMessage(peer, payload);
  if (result.error) return roomError(peer, ...result.error, requestId);
  const { room, player } = result;
  bumpActivity(room);

  if (payload.type === 'room.sync') return directSnapshot(peer, room);
  if (payload.type === 'room.leave') return leaveRoom(room, player);

  if (payload.type === 'room.settings') {
    if (room.state !== 'lobby' || room.hostPlayerId !== player.id) return roomError(peer, 'NOT_HOST', '방장만 설정을 바꿀 수 있어요.', requestId);
    room.settings = validateSettings(payload.settings); resetReady(room); broadcast(room); return;
  }

  if (payload.type === 'player.ready') {
    if (room.state !== 'lobby') return roomError(peer, 'MATCH_IN_PROGRESS', '게임이 진행 중이에요.', requestId);
    if (room.hostPlayerId === player.id) return directSnapshot(peer, room);
    player.ready = Boolean(payload.ready); broadcast(room); return;
  }

  if (payload.type === 'match.start') {
    if (room.state !== 'lobby' || room.hostPlayerId !== player.id) return roomError(peer, 'NOT_HOST', '방장만 게임을 시작할 수 있어요.', requestId);
    if (!readyToStart(room)) return roomError(peer, 'NOT_READY', '다른 참가자가 들어와 모두 준비해야 시작할 수 있어요.', requestId);
    if (!startMatch(room)) return roomError(peer, 'NOT_ENOUGH_QUESTIONS', '선택한 항목의 문제를 준비하지 못했어요.', requestId);
    return;
  }

  if (payload.type === 'match.prepared') {
    confirmImagesPrepared(room, player, payload);
    return;
  }

  if (payload.type === 'chat.send') {
    const result = sendChat(room, player, payload);
    if (result.error) return roomError(peer, ...result.error, requestId);
    return;
  }

  if (payload.type === 'answer.submit') {
    const current = room.match?.current;
    const result = sendChat(room, player, { ...payload, text: payload.answer });
    if (result.error) return roomError(peer, ...result.error, requestId);
    message(peer, { type: 'answer.result', requestId, result: result.correct ? 'correct' : 'wrong', roundId: current?.id || null });
    return;
  }

  if (payload.type === 'match.rematch') {
    if (room.state !== 'finished' || room.hostPlayerId !== player.id) return roomError(peer, 'NOT_HOST', '방장만 다시 시작할 수 있어요.', requestId);
    room.state = 'lobby'; room.match = null; room.countdownEndsAt = null; resetReady(room); bumpActivity(room); broadcast(room); return;
  }

  roomError(peer, 'UNKNOWN_EVENT', '지원하지 않는 요청이에요.', requestId);
}

function onPeerClosed(peer) {
  peers.delete(peer);
  const room = rooms.get(peer.roomCode);
  const player = room?.players.get(peer.playerId);
  if (!room || !player || player.peer !== peer) return;
  player.peer = null;
  player.disconnectTimer = setTimeout(() => {
    if (!room.players.has(player.id) || player.peer) return;
    leaveRoom(room, player, `${player.nickname}님이 방에서 나갔어요.`);
  }, RECONNECT_GRACE_MS);
  if (['preparing', 'countdown'].includes(room.state)) cancelMatch(room, '참가자 연결이 끊겨 대기실로 돌아왔어요. 다시 준비해 주세요.');
  else if (['active', 'reveal'].includes(room.state) && connectedPlayers(room).length < 2) cancelMatch(room, '참가자가 부족해 대결을 취소했어요.');
  else { bumpActivity(room); broadcast(room); }
}

function websocketAccept(key) {
  return createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
}

function frame(payload, opcode = 0x1) {
  const body = Buffer.from(payload);
  if (body.length > 65535) throw new Error('WebSocket response too large');
  if (body.length < 126) return Buffer.concat([Buffer.from([0x80 | opcode, body.length]), body]);
  const header = Buffer.alloc(4); header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(body.length, 2);
  return Buffer.concat([header, body]);
}

function attachWebSocket(socket) {
  const peer = { alive: true, buffer: Buffer.alloc(0), roomCode: null, playerId: null, token: null,
    send(payload) { if (this.alive) socket.write(frame(payload)); },
    close(code = 1000) { if (!this.alive) return; this.alive = false; try { socket.write(Buffer.from([0x88, 0x02, code >> 8, code & 0xff])); } finally { socket.end(); } }
  };
  peers.add(peer);
  socket.on('data', (chunk) => {
    peer.buffer = Buffer.concat([peer.buffer, chunk]);
    while (peer.buffer.length >= 2) {
      const first = peer.buffer[0]; const second = peer.buffer[1]; const opcode = first & 0x0f; const masked = (second & 0x80) !== 0;
      let length = second & 0x7f; let offset = 2;
      if (length === 126) { if (peer.buffer.length < 4) return; length = peer.buffer.readUInt16BE(2); offset = 4; }
      else if (length === 127) { peer.close(1009); return; }
      if (!masked || length > 8192 || peer.buffer.length < offset + 4 + length) return;
      const mask = peer.buffer.subarray(offset, offset + 4); offset += 4;
      const input = Buffer.from(peer.buffer.subarray(offset, offset + length));
      for (let index = 0; index < input.length; index += 1) input[index] ^= mask[index % 4];
      peer.buffer = peer.buffer.subarray(offset + length);
      if (opcode === 0x8) return peer.close();
      if (opcode === 0x9) { if (peer.alive) socket.write(frame(input, 0xA)); continue; }
      if (opcode === 0x1 && (first & 0x80)) handleMessage(peer, input.toString('utf8'));
    }
  });
  socket.on('error', () => {});
  socket.on('close', () => onPeerClosed(peer));
}

const server = createServer(async (request, response) => {
  const requestPath = (request.url || '/').split('?')[0];
  if (requestPath === '/health/live' || requestPath === '/health/ready') {
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ ok: true, rooms: rooms.size, questions: questions.length }));
    return;
  }
  if (requestPath === '/api/reports') {
    if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return; }
    try {
      const report = saveQuestionReport(await readRequestJson(request));
      if (!report) { response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify({ ok: false })); return; }
      response.writeHead(201, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify({ ok: true, id: report.id }));
    } catch (error) {
      console.error('Unable to save question report', error);
      response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify({ ok: false }));
    }
    return;
  }
  let decoded;
  try { decoded = decodeURIComponent(requestPath); } catch { response.writeHead(400); response.end('Bad request'); return; }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const target = normalize(join(ROOT, relative));
  if (!target.startsWith(`${ROOT}/`) || !existsSync(target) || statSync(target).isDirectory()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Not found'); return;
  }
  response.writeHead(200, {
    'content-type': mimeTypes[extname(target).toLowerCase()] || 'application/octet-stream',
    'cache-control': ['.html', '.js', '.css', '.json'].includes(extname(target).toLowerCase()) ? 'no-store, max-age=0' : 'public, max-age=86400',
    'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.wikimedia.org https://*.wikipedia.org; connect-src 'self' wss:; frame-src 'none'; object-src 'none'; base-uri 'none'"
  });
  createReadStream(target).pipe(response);
});

server.on('upgrade', (request, socket) => {
  const pathname = (request.url || '').split('?')[0];
  const key = request.headers['sec-websocket-key'];
  if (pathname !== '/ws' || request.headers.upgrade?.toLowerCase() !== 'websocket' || typeof key !== 'string') { socket.destroy(); return; }
  socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${websocketAccept(key)}`, '', ''].join('\r\n'));
  attachWebSocket(socket);
});

const heartbeat = setInterval(() => {
  for (const peer of peers) {
    if (!peer.alive) peers.delete(peer);
    else message(peer, { type: 'ping', serverNow: Date.now() });
  }
}, 25000);

function shutdown() {
  clearInterval(heartbeat);
  for (const room of rooms.values()) closeRoom(room, '서버가 업데이트되어 방을 종료했어요.');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
server.listen(PORT, '0.0.0.0', () => console.log(`Samsam server listening on ${PORT}`));
