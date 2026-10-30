(() => {
  const ROUND_SIZE = 10;
  const DURATION = 5000;
  const SINGLE_ROUND_OPTIONS = new Set([5, 10, 15, 20]);
  const SINGLE_SECONDS_OPTIONS = new Set([3, 5, 10, 15, 20, 30]);
  const el = (id) => document.getElementById(id);
  const screens = ['landing', 'single-setup', 'single-game', 'single-result', 'battle-entry', 'battle-lobby', 'battle-game', 'battle-result'];
  const ui = Object.fromEntries(screens.map((name) => [name, el(`${name}-screen`)]));
  Object.assign(ui, {
    shell: document.querySelector('.app-shell'),
    toast: el('toast'), soundHome: el('sound-button'), soundSingle: el('game-sound-button'), soundBattle: el('battle-game-sound'),
    singleCategory: el('single-category-grid'), singlePersonWrap: el('single-person-filter-wrap'), singlePersonFilter: el('single-person-filter'), singleMode: el('single-mode-grid'), singleStart: el('single-start'),
    singleRounds: el('single-round-count'), singleSeconds: el('single-question-seconds'), singleRuleSummary: el('single-rule-summary'),
    singleCategoryLabel: el('single-category-label'), singleRound: el('single-round-label'), singleScore: el('single-score-label'), singleProgress: el('single-progress'), singleTimer: el('single-timer-number'), singleTimerBar: el('single-timer-bar'), singleStage: el('single-question-stage'), singleImage: el('single-question-image'), singleLoading: el('single-loading-text'), singleCover: el('single-cover-layer'), singleReport: el('single-report'), singleReveal: el('single-reveal-panel'), singleResultLabel: el('single-result-label'), singleAnswerLabel: el('single-answer-label'), singleAccepted: el('single-accepted-label'), singleForm: el('single-answer-form'), singleInput: el('single-answer-input'), singleFeedback: el('single-guess-feedback'), singleCorrect: el('single-correct'), singlePass: el('single-pass'), singlePause: el('single-pause'), singleNext: el('single-next'), singleShortcut: el('single-shortcut-hint'),
    singleFinalScore: el('single-final-score'), singleResultSummary: el('single-result-summary'), singleCorrectCount: el('single-correct-count'), singlePassCount: el('single-pass-count'), singleTimeoutCount: el('single-timeout-count'),
    battleNickname: el('battle-nickname'), battleCode: el('battle-room-code'), battleEntryFeedback: el('battle-entry-feedback'), battleRoomTitle: el('battle-room-title'), battleLobbyNotice: el('battle-lobby-notice'), battleSettings: el('battle-settings'), battleCategory: el('battle-category-grid'), battlePersonWrap: el('battle-person-filter-wrap'), battlePersonFilter: el('battle-person-filter'), battleRounds: el('battle-round-count'), battlePlayers: el('battle-player-list'), battlePlayerCount: el('battle-player-count'), battleReady: el('battle-ready'), battleStart: el('battle-start'),
    battleCategoryLabel: el('battle-category-label'), battleRound: el('battle-round-label'), battleTimer: el('battle-timer-number'), battleLeader: el('battle-leaderboard'), battleScoreboard: el('battle-scoreboard'), battleStage: el('battle-question-stage'), battleImage: el('battle-question-image'), battleLoading: el('battle-loading-text'), battleReport: el('battle-report'), battleReveal: el('battle-reveal-panel'), battleResultLabel: el('battle-result-label'), battleAnswerLabel: el('battle-answer-label'), battleWinner: el('battle-winner-label'), battleChatPanel: el('battle-chat-panel'), battleChatList: el('battle-chat-list'), battleForm: el('battle-answer-form'), battleInput: el('battle-answer-input'), battleSubmit: el('battle-answer-submit'), battleFeedback: el('battle-guess-feedback'), battleWinnerSummary: el('battle-winner-summary'), battleRanking: el('battle-ranking'), battleRematch: el('battle-rematch')
  });

  const labels = { person: '인물 버전', korean: '인물 버전 · 국내 인물', global: '인물 버전 · 해외 인물', character: '인물 버전 · 캐릭터', object: '사물 버전', mixed: '인물·사물 섞기' };
  const modeLabels = { typing: '직접 입력하기', group: '같이 외치기' };
  const animalAvatars = ['🐶', '🐱', '🐼', '🦊', '🐸', '🐰', '🦁', '🐹', '🐯', '🐨', '🦄', '🐥'];
  let DATA = { korean: [], global: [], character: [], object: [], person: [], mixed: [] };
  let currentScreen = 'landing';
  let soundEnabled = true;
  let audioContext = null;
  let toastTimer = null;
  let single = null;
  let singleSelected = 'person';
  let singlePersonCategory = 'person';
  let singleMode = 'typing';
  let battleSocket = null;
  let battleRoom = null;
  let battleSession = null;
  let battleReconnectTimer = null;
  let battlePending = null;
  let battleLastRoundId = null;
  let battleRaf = null;
  let battleComposing = false;
  let battleFocusAfterSend = false;
  let battlePreparation = null;
  let battleClockAnchor = { serverNow: Date.now(), receivedAt: performance.now() };
  const imagePreloads = new Map();

  try { soundEnabled = localStorage.getItem('samsam-sound') !== 'off'; } catch (_) { /* optional storage */ }
  try { battleSession = JSON.parse(sessionStorage.getItem('samsam-battle-session') || 'null'); } catch (_) { /* optional storage */ }

  const requestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const normalize = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s·._-]/g, '');
  const shuffled = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1)); [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  };
  const show = (screen) => {
    currentScreen = screen;
    screens.forEach((name) => ui[name].classList.toggle('is-hidden', name !== screen));
    const playing = screen === 'single-game' || screen === 'battle-game';
    document.body.classList.toggle('is-playing', playing);
    ui.shell.classList.toggle('is-playing', playing);
    updateGameViewport();
  };
  function updateGameViewport() {
    // Mobile keyboards can shrink the visual viewport without changing innerHeight or dvh.
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    ui.shell.style.setProperty('--game-viewport-height', `${height}px`);
    ui.shell.style.setProperty('--game-viewport-top', `${viewport?.offsetTop || 0}px`);
    ui.shell.classList.toggle('compact-game', height < 560);
  }
  window.addEventListener('resize', updateGameViewport);
  window.visualViewport?.addEventListener('resize', updateGameViewport);
  window.visualViewport?.addEventListener('scroll', updateGameViewport);
  const notify = (message) => {
    ui.toast.textContent = message; ui.toast.classList.add('visible'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('visible'), 2300);
  };
  const reportKey = (questionId) => `samsam-question-report-v1-${questionId}`;
  function updateReportButton(button, question) {
    const reported = Boolean(question?.id && sessionStorage.getItem(reportKey(question.id)));
    button.disabled = !question?.id || reported;
    button.classList.toggle('reported', reported);
    button.textContent = reported ? '✓ 신고됨' : '🚩 문제 신고';
  }
  async function reportQuestion(question, source, button) {
    if (!question?.id || button.disabled) return;
    button.disabled = true; button.textContent = '신고 접수 중';
    try {
      const response = await fetch('./api/reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId: question.id, source }) });
      if (!response.ok) throw new Error('report request');
      sessionStorage.setItem(reportKey(question.id), '1'); button.classList.add('reported'); button.textContent = '✓ 신고됨'; notify('문제 신고를 접수했어요. 검수 후 반영할게요.');
    } catch (_) {
      button.disabled = false; button.textContent = '🚩 문제 신고'; notify('신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }
  const categoryFor = (version, personCategory) => version === 'person' ? personCategory : version;
  function avatarFor(player) {
    let hash = 0; for (const letter of String(player.id || player.nickname)) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
    return animalAvatars[hash % animalAvatars.length];
  }

  function preloadImage(source) {
    if (!source) return Promise.resolve(false);
    const existing = imagePreloads.get(source); if (existing && (!existing.ready || existing.ok)) return existing.promise;
    const entry = { ready: false, ok: false, image: null, promise: null };
    const attempt = () => new Promise((resolve) => {
      const image = new Image(); let settled = false;
      const finish = (ok) => { if (settled) return; settled = true; clearTimeout(timeout); image.onload = null; image.onerror = null; resolve(ok ? image : null); };
      const timeout = setTimeout(() => finish(false), 12000);
      image.decoding = 'async'; image.onload = () => { if (typeof image.decode === 'function') image.decode().then(() => finish(image.naturalWidth > 0)).catch(() => finish(false)); else finish(image.naturalWidth > 0); };
      image.onerror = () => finish(false); image.src = source;
    });
    entry.promise = (async () => {
      let image = await attempt(); if (!image) image = await attempt();
      entry.image = image; entry.ready = true; entry.ok = Boolean(image); return entry.ok;
    })();
    imagePreloads.set(source, entry);
    return entry.promise;
  }
  function retainPreloads(sources) {
    const keep = new Set(sources);
    for (const source of imagePreloads.keys()) if (!keep.has(source)) imagePreloads.delete(source);
  }
  function imageReady(source) { return Boolean(imagePreloads.get(source)?.ready && imagePreloads.get(source)?.ok); }
  function bindQuestionImage(image, stage, loading, source) {
    stage.classList.remove('image-error');
    const prepared = imagePreloads.get(source)?.image;
    if (prepared) {
      // Keep and display the decoded node itself instead of starting another image load.
      if (prepared !== image) {
        if (prepared.isConnected) {
          const placeholder = document.createElement('img'); placeholder.id = prepared.id; placeholder.alt = prepared.alt;
          prepared.replaceWith(placeholder);
          if (ui.singleImage === prepared) ui.singleImage = placeholder;
          if (ui.battleImage === prepared) ui.battleImage = placeholder;
        }
        prepared.id = image.id; prepared.alt = image.alt; image.replaceWith(prepared);
      }
      return prepared;
    }
    image.onload = () => stage.classList.remove('image-error');
    image.onerror = () => { stage.classList.add('image-error'); stage.classList.add('loading'); loading.textContent = '사진을 불러오지 못했어요'; loading.classList.remove('is-hidden'); };
    image.src = source;
    return image;
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }
  function note(frequency, duration, delay = 0, type = 'sine', volume = 0.055) {
    const context = ensureAudio(); if (!context) return;
    const start = context.currentTime + delay; const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + duration + 0.02);
  }
  function playSound(kind) {
    if (!soundEnabled) return;
    if (kind === 'tick') note(880, 0.07, 0, 'sine', 0.045);
    if (kind === 'correct') { note(660, 0.16, 0, 'sine', 0.06); note(990, 0.28, 0.1, 'sine', 0.055); }
    if (kind === 'wrong') { note(190, 0.12, 0, 'square', 0.035); note(150, 0.16, 0.1, 'square', 0.03); }
    if (kind === 'pass') note(300, 0.18, 0, 'triangle', 0.04);
    if (kind === 'timeout') { note(330, 0.48, 0, 'triangle', 0.075); note(660, 0.32, 0.01, 'sine', 0.035); }
  }
  function renderSoundButtons() {
    const icon = soundEnabled ? '🔊' : '🔇';
    ui.soundHome.innerHTML = `<span aria-hidden="true">${icon}</span> 효과음 ${soundEnabled ? '켜짐' : '꺼짐'}`;
    ui.soundHome.setAttribute('aria-pressed', String(soundEnabled));
    [ui.soundSingle, ui.soundBattle].forEach((button) => { button.textContent = icon; button.setAttribute('aria-pressed', String(soundEnabled)); button.setAttribute('aria-label', `효과음 ${soundEnabled ? '끄기' : '켜기'}`); });
  }
  function toggleSound() { soundEnabled = !soundEnabled; try { localStorage.setItem('samsam-sound', soundEnabled ? 'on' : 'off'); } catch (_) { /* optional storage */ } renderSoundButtons(); if (soundEnabled) playSound('correct'); }

  function updateSingleCategories() {
    [...ui.singleCategory.querySelectorAll('.category-card')].forEach((button) => {
      const active = button.dataset.category === singleSelected; button.classList.toggle('selected', active); button.setAttribute('aria-checked', String(active));
    });
    ui.singlePersonFilter.disabled = singleSelected !== 'person';
  }
  function singleSettings() {
    const roundCount = Number(ui.singleRounds.value);
    const seconds = Number(ui.singleSeconds.value);
    return { roundCount: SINGLE_ROUND_OPTIONS.has(roundCount) ? roundCount : ROUND_SIZE, duration: SINGLE_SECONDS_OPTIONS.has(seconds) ? seconds * 1000 : DURATION };
  }
  function updateSingleRules() {
    const settings = singleSettings();
    ui.singleRuleSummary.textContent = `한 판 ${settings.roundCount}문제 · 문제당 ${settings.duration / 1000}초`;
  }
  function updateSingleModes() {
    [...ui.singleMode.querySelectorAll('.mode-card')].forEach((button) => {
      const active = button.dataset.mode === singleMode; button.classList.toggle('selected', active); button.setAttribute('aria-checked', String(active));
    });
  }
  const queueKey = (category) => `samsam-queue-v5-${category}`;
  function queueFor(category) {
    const ids = DATA[category].map((item) => item.id); let stored = null;
    try { stored = JSON.parse(localStorage.getItem(queueKey(category))); } catch (_) { /* optional storage */ }
    let queue = Array.isArray(stored?.queue) ? stored.queue.filter((item) => ids.includes(item)) : [];
    let seen = Array.isArray(stored?.seen) ? stored.seen.filter((item) => ids.includes(item)) : [];
    const known = new Set([...queue, ...seen]); const additions = ids.filter((item) => !known.has(item));
    if (!queue.length) { queue = shuffled([...seen, ...additions]); if (queue.length > 1 && queue[0] === stored?.last) [queue[0], queue[1]] = [queue[1], queue[0]]; seen = []; }
    else if (additions.length) queue.push(...shuffled(additions));
    return { queue, seen, last: stored?.last || null };
  }
  function takeQuestion(category, excluded) {
    let store = queueFor(category); const all = DATA[category];
    for (let tries = 0; tries < all.length * 3; tries += 1) {
      if (!store.queue.length) { store = { queue: shuffled(store.seen), seen: [], last: store.last }; if (store.queue.length > 1 && store.queue[0] === store.last) [store.queue[0], store.queue[1]] = [store.queue[1], store.queue[0]]; }
      const itemId = store.queue.shift(); if (!itemId) return null;
      if (excluded.has(itemId)) { store.queue.push(itemId); continue; }
      const question = all.find((item) => item.id === itemId); if (!question) continue;
      store.seen.push(itemId); store.last = itemId;
      try { localStorage.setItem(queueKey(category), JSON.stringify(store)); } catch (_) { /* optional storage */ }
      return question;
    }
    return null;
  }
  function setSingleControls(state) {
    const playing = state === 'playing'; const groupPlaying = playing && single?.mode === 'group';
    ui.singleCorrect.classList.toggle('is-hidden', !groupPlaying); ui.singlePass.classList.toggle('is-hidden', !playing);
    ui.singlePause.classList.toggle('is-hidden', !(playing || state === 'paused'));
    ui.singlePause.innerHTML = state === 'paused' ? '▶ 계속하기' : 'Ⅱ 일시정지'; ui.singleNext.classList.toggle('is-hidden', state !== 'revealed');
    ui.singleForm.classList.toggle('is-hidden', !(single?.mode === 'typing' && playing)); ui.singleInput.disabled = !playing;
    ui.singleShortcut.textContent = single?.mode === 'typing' ? 'Enter 제출 · P 일시정지' : 'Enter 정답 · Space 패스 · P 일시정지';
  }
  function resetSingleQuestionUi() {
    ui.singleStage.classList.add('loading'); ui.singleStage.classList.remove('image-error'); ui.singleLoading.classList.remove('is-hidden'); ui.singleReveal.classList.add('is-hidden'); ui.singleCover.classList.add('is-hidden');
    // Detach the displayed node without clearing the decoded image kept for later rounds.
    const placeholder = document.createElement('img'); placeholder.id = ui.singleImage.id; placeholder.alt = ui.singleImage.alt;
    ui.singleImage.replaceWith(placeholder); ui.singleImage = placeholder;
    ui.singleTimer.textContent = String((single?.duration || DURATION) / 1000); ui.singleTimerBar.style.transform = 'scaleX(1)'; ui.singleInput.value = ''; ui.singleFeedback.textContent = ''; ui.singleForm.classList.remove('wrong');
  }
  function renderSingleProgress() {
    if (!single) return;
    const correct = single.results.filter((result) => result === 'correct').length;
    const round = Math.min(single.target, single.results.length + (single.state === 'revealed' ? 0 : 1));
    ui.singleProgress.replaceChildren(...[['🎯 진행', `${round} / ${single.target} 라운드`, `정답 ${correct}개`]].flatMap(([label, count, score]) => {
      const prefix = document.createElement('span'); prefix.textContent = label; const progress = document.createElement('strong'); progress.textContent = count; const total = document.createElement('em'); total.textContent = score; return [prefix, progress, total];
    }));
  }
  function stopSingleTimer() { if (single?.raf) cancelAnimationFrame(single.raf); if (single) single.raf = null; }
  function startSingleTimer() {
    single.deadline = performance.now() + single.remaining;
    const tick = () => {
      if (!single || single.state !== 'playing') return;
      single.remaining = Math.max(0, single.deadline - performance.now()); const seconds = Math.ceil(single.remaining / 1000);
      ui.singleTimer.textContent = String(seconds); if (seconds !== single.lastSecond) { single.lastSecond = seconds; if (seconds > 0 && seconds <= 3) playSound('tick'); }
      ui.singleTimerBar.style.transform = `scaleX(${single.remaining / single.duration})`;
      if (single.remaining <= 0) { revealSingle('timeout'); return; } single.raf = requestAnimationFrame(tick);
    }; single.raf = requestAnimationFrame(tick);
  }
  async function nextSingleQuestion() {
    if (!single) return; stopSingleTimer(); single.state = 'loading'; setSingleControls('loading'); resetSingleQuestionUi();
    const question = single.queue.shift(); if (!question) return endSingleGame();
    single.question = question; single.roundIds.add(question.id); updateReportButton(ui.singleReport, question); ui.singleRound.textContent = `${single.results.length + 1} / ${single.target}`; renderSingleProgress();
    const loaded = await preloadImage(question.image);
    if (!single || single.question !== question) return;
    if (!loaded) { single.roundIds.delete(question.id); single.failedIds.add(question.id); notify('문제가 있는 사진은 자동으로 건너뛰었어요.'); return nextSingleQuestion(); }
    ui.singleImage = bindQuestionImage(ui.singleImage, ui.singleStage, ui.singleLoading, question.image);
    ui.singleStage.classList.remove('loading'); ui.singleLoading.classList.add('is-hidden'); single.remaining = single.duration; single.lastSecond = single.duration / 1000; single.state = 'playing'; setSingleControls('playing'); startSingleTimer();
    if (single.mode === 'typing') requestAnimationFrame(() => ui.singleInput.focus({ preventScroll: true }));
  }
  function revealSingle(kind, guess = '') {
    if (!single || single.state !== 'playing') return; stopSingleTimer(); single.state = 'revealed'; single.results.push(kind); playSound(kind);
    ui.singleScore.textContent = String(single.results.filter((item) => item === 'correct').length); renderSingleProgress(); ui.singleResultLabel.textContent = kind === 'correct' ? '정답!' : kind === 'pass' ? '패스' : '시간 초과!';
    ui.singleResultLabel.className = `result-label ${kind === 'timeout' ? 'timeout' : kind === 'pass' ? 'pass' : ''}`; ui.singleAnswerLabel.textContent = single.question.answer;
    const accepted = single.question.accepted?.length ? `인정 답안: ${single.question.accepted.join(', ')}` : ''; ui.singleAccepted.textContent = guess && kind === 'correct' ? `입력한 답: ${guess}${accepted ? ` · ${accepted}` : ''}` : accepted;
    ui.singleReveal.classList.remove('is-hidden'); setSingleControls('revealed'); ui.singleNext.textContent = single.results.length >= single.target ? '결과 보기 →' : '다음 문제 →';
  }
  function correctSingleAndAdvance() {
    if (!single || single.mode !== 'group' || single.state !== 'playing') return; stopSingleTimer(); single.state = 'loading'; single.results.push('correct'); playSound('correct'); ui.singleScore.textContent = String(single.results.filter((item) => item === 'correct').length); renderSingleProgress(); notify('정답!');
    if (single.results.length >= single.target) endSingleGame(); else nextSingleQuestion();
  }
  function submitSingleAnswer() {
    if (!single || single.mode !== 'typing' || single.state !== 'playing') return; const guess = ui.singleInput.value.trim();
    if (!guess) { ui.singleFeedback.textContent = '정답을 먼저 입력하세요'; ui.singleInput.focus(); return; }
    const answers = [single.question.answer, ...(single.question.accepted || [])].map(normalize);
    if (answers.includes(normalize(guess))) { stopSingleTimer(); single.state = 'loading'; single.results.push('correct'); playSound('correct'); ui.singleScore.textContent = String(single.results.filter((item) => item === 'correct').length); renderSingleProgress(); notify('정답!'); if (single.results.length >= single.target) endSingleGame(); else nextSingleQuestion(); return; }
    playSound('wrong'); ui.singleFeedback.textContent = '아쉬워요, 다시!'; ui.singleForm.classList.remove('wrong'); void ui.singleForm.offsetWidth; ui.singleForm.classList.add('wrong'); ui.singleInput.select();
  }
  function pauseSingle() {
    if (!single) return;
    if (single.state === 'playing') { stopSingleTimer(); single.state = 'paused'; ui.singleCover.classList.remove('is-hidden'); setSingleControls('paused'); }
    else if (single.state === 'paused') { single.state = 'playing'; ui.singleCover.classList.add('is-hidden'); setSingleControls('playing'); startSingleTimer(); if (single.mode === 'typing') ui.singleInput.focus({ preventScroll: true }); }
  }
  async function prepareSingleQuestions(game) {
    const selected = [];
    while (selected.length < game.target) {
      const question = takeQuestion(game.category, new Set(selected.map((item) => item.id)));
      if (!question) break;
      selected.push(question);
    }
    let finished = 0;
    retainPreloads(selected.map((question) => question.image));
    const prepared = await Promise.all(selected.map(async (question) => {
      const loaded = await preloadImage(question.image); finished += 1;
      if (single === game) ui.singleLoading.textContent = `사진을 미리 준비하고 있어요 (${finished}/${selected.length})`;
      return loaded ? question : null;
    }));
    if (single !== game) return;
    const ready = prepared.filter(Boolean); const attempted = new Set(selected.map((question) => question.id)); const failed = selected.filter((question, index) => !prepared[index]).map((question) => question.id);
    while (ready.length < game.target) {
      const replacement = takeQuestion(game.category, attempted); if (!replacement) break; attempted.add(replacement.id);
      ui.singleLoading.textContent = `대체 사진을 준비하고 있어요 (${ready.length}/${game.target})`;
      if (await preloadImage(replacement.image)) ready.push(replacement); else failed.push(replacement.id);
      if (single !== game) return;
    }
    game.queue = ready; game.target = Math.min(game.target, game.queue.length); ui.singleStage.dataset.preloadFailed = failed.join(',');
    if (!game.target) { notify('준비된 사진을 불러오지 못했어요. 다시 시도해 주세요.'); show('single-setup'); return; }
    ui.singleStage.dataset.preloaded = String(game.queue.length);
    nextSingleQuestion();
  }
  function startSingleGame() {
    const category = categoryFor(singleSelected, singlePersonCategory); if (!DATA[category]?.length) return notify('문제 데이터를 아직 준비하지 못했어요.'); ensureAudio();
    const settings = singleSettings(); stopSingleTimer();
    single = { category, mode: singleMode, state: 'loading', question: null, queue: [], results: [], target: Math.min(settings.roundCount, DATA[category].length), roundIds: new Set(), failedIds: new Set(), duration: settings.duration, remaining: settings.duration, lastSecond: settings.duration / 1000, deadline: 0, raf: null };
    setSingleControls('loading');
    ui.singleRound.textContent = `1 / ${single.target}`;
    ui.singleCategoryLabel.textContent = `${labels[category]} · ${modeLabels[singleMode]}`; ui.singleScore.textContent = '0'; show('single-game'); ui.singleStage.dataset.preloaded = '0'; resetSingleQuestionUi(); renderSingleProgress(); ui.singleLoading.textContent = '사진을 미리 준비하고 있어요'; void prepareSingleQuestions(single);
  }
  function endSingleGame() {
    if (!single) return; stopSingleTimer(); const totals = { correct: 0, pass: 0, timeout: 0 }; single.results.forEach((item) => { totals[item] += 1; });
    ui.singleFinalScore.textContent = totals.correct; ui.singleResultSummary.textContent = `${single.results.length}문제 중 ${totals.correct}문제를 맞혔어요.`; ui.singleCorrectCount.textContent = totals.correct; ui.singlePassCount.textContent = totals.pass; ui.singleTimeoutCount.textContent = totals.timeout; show('single-result');
  }

  function socketUrl() {
    const path = location.pathname.includes('/samsam/') ? `${location.pathname.slice(0, location.pathname.indexOf('/samsam/') + 9)}ws` : '/ws';
    return `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${path}`;
  }
  function saveBattleSession(session) { battleSession = session; try { sessionStorage.setItem('samsam-battle-session', JSON.stringify(session)); } catch (_) { /* optional storage */ } }
  function clearBattleSession() { battleSession = null; battlePreparation = null; battleLastRoundId = null; try { sessionStorage.removeItem('samsam-battle-session'); } catch (_) { /* optional storage */ } }
  function sendBattle(payload) { if (battleSocket?.readyState === WebSocket.OPEN) battleSocket.send(JSON.stringify({ requestId: requestId(), roomCode: battleSession?.roomCode || payload.roomCode, ...payload })); }
  function connectBattle() {
    if (battleSocket?.readyState === WebSocket.OPEN || battleSocket?.readyState === WebSocket.CONNECTING) return;
    clearTimeout(battleReconnectTimer);
    battleSocket = new WebSocket(socketUrl());
    battleSocket.addEventListener('open', () => {
      if (battleSession) sendBattle({ type: 'room.reconnect', ...battleSession });
      else if (battlePending) { const pending = battlePending; battlePending = null; sendBattle(pending); }
    });
    battleSocket.addEventListener('message', (event) => { try { handleBattleEvent(JSON.parse(event.data)); } catch (_) { /* malformed server message */ } });
    battleSocket.addEventListener('close', () => {
      battlePreparation = null;
      if (battleSession && !['landing', 'battle-entry'].includes(currentScreen)) {
        notify('연결이 끊겨 다시 연결하고 있어요.'); clearTimeout(battleReconnectTimer); battleReconnectTimer = setTimeout(connectBattle, 1400);
      }
    });
    battleSocket.addEventListener('error', () => {});
  }
  function beginBattle(payload) {
    ui.battleEntryFeedback.textContent = '';
    const nickname = ui.battleNickname.value.trim(); if (!nickname) { ui.battleEntryFeedback.textContent = '닉네임을 입력해 주세요.'; ui.battleNickname.focus(); return; }
    battlePending = { ...payload, nickname }; connectBattle();
  }
  function getBattleMe() { return battleRoom?.players?.find((player) => player.id === battleSession?.playerId) || null; }
  function battleVersionLabel(settings) { return labels[categoryFor(settings.category, settings.personCategory)]; }
  function prepareBattleImages(room) {
    const match = room.match;
    if (!match) { battlePreparation = null; return; }
    const key = `${match.id}:${match.preloadVersion}`;
    if (battlePreparation?.key === key) return;
    const sources = [...new Set((match.preloadImages || []).filter(Boolean))];
    const preparation = { key, loaded: 0, total: sources.length, done: false };
    battlePreparation = preparation;
    retainPreloads(sources);
    ui.battleStage.dataset.preloaded = '0';
    ui.battleStage.dataset.preloadTotal = String(sources.length);
    void Promise.all(sources.map(async (source) => {
      const ok = await preloadImage(source);
      if (battlePreparation !== preparation) return ok;
      if (ok) preparation.loaded += 1;
      ui.battleStage.dataset.preloaded = String(preparation.loaded);
      return ok;
    })).then((results) => {
      if (battlePreparation !== preparation || battleRoom?.match?.id !== match.id || battleRoom?.match?.preloadVersion !== match.preloadVersion) return;
      preparation.done = true;
      if (battleRoom.state === 'preparing') sendBattle({ type: 'match.prepared', matchId: match.id, preloadVersion: match.preloadVersion, failedImages: sources.filter((source, index) => !results[index]) });
      renderBattleRoom();
    });
  }
  function setBattleCategoryControls(room, isHost) {
    const settings = room.settings;
    [...ui.battleCategory.querySelectorAll('.category-card')].forEach((button) => {
      const active = button.dataset.category === settings.category; button.classList.toggle('selected', active); button.setAttribute('aria-checked', String(active)); button.disabled = !isHost;
    });
    ui.battlePersonFilter.value = settings.personCategory; ui.battlePersonFilter.disabled = !isHost || settings.category !== 'person'; ui.battleRounds.value = String(settings.roundCount); ui.battleRounds.disabled = !isHost;
    ui.battleSettings.classList.toggle('settings-locked', !isHost);
  }
  function renderBattleLobby(room) {
    const me = getBattleMe(); const isHost = room.hostPlayerId === battleSession?.playerId; show('battle-lobby');
    ui.battleRoomTitle.textContent = room.code; ui.battleLobbyNotice.textContent = isHost ? '다른 참가자들이 모두 준비되면 시작하세요.' : '준비를 마치면 방장이 게임을 시작해요.';
    setBattleCategoryControls(room, isHost); ui.battlePlayerCount.textContent = `${room.players.length}명`;
    ui.battlePlayers.replaceChildren(...room.players.map((player) => {
      const item = document.createElement('li'); item.className = `player-card${player.id === battleSession?.playerId ? ' me' : ''}`;
      const top = document.createElement('div'); top.className = 'player-card-top'; const avatar = document.createElement('span'); avatar.className = 'animal-avatar'; avatar.textContent = avatarFor(player);
      const identity = document.createElement('div'); const name = document.createElement('strong'); name.textContent = player.nickname; const meta = document.createElement('span');
      meta.textContent = player.id === room.hostPlayerId ? '방장' : player.connected ? (player.ready ? '준비 완료' : '준비 중') : '재접속 대기';
      identity.append(name, meta); top.append(avatar, identity);
      const stats = document.createElement('div'); stats.className = 'player-stats';
      [['이번 판', `${player.score}개`], ['방 누적', `${player.totalCorrect}개`], ['방 우승', `${player.matchWins}회`]].forEach(([label, value]) => { const stat = document.createElement('span'); const title = document.createElement('small'); const number = document.createElement('b'); title.textContent = label; number.textContent = value; stat.append(title, number); stats.append(stat); });
      item.append(top, stats); return item;
    }));
    const ready = Boolean(me?.ready); ui.battleReady.textContent = ready ? '준비 취소' : '준비하기'; ui.battleReady.classList.toggle('is-hidden', isHost); ui.battleReady.disabled = isHost || !me?.connected; ui.battleStart.classList.toggle('is-hidden', !isHost);
    ui.battleStart.disabled = !isHost || !(room.players.length >= 2 && room.players.every((player) => player.connected && (player.id === room.hostPlayerId || player.ready)));
  }
  function renderBattleScoreboard(room) {
    const players = room.players.filter((player) => !player.leftMatch).sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
    const highScore = Math.max(0, ...players.map((player) => player.score)); const leaders = players.filter((player) => player.score === highScore);
    const crown = document.createElement('span'); crown.textContent = highScore ? '👑 현재 1위' : '🏁 대결 시작'; const leaderText = document.createElement('strong'); leaderText.textContent = highScore ? `${leaders.map((player) => player.nickname).join(' · ')} ${leaders.length > 1 ? '공동 1위' : '1위'}` : '첫 정답을 노려보세요!'; const leaderScore = document.createElement('em'); leaderScore.textContent = highScore ? `${highScore}개 정답` : '';
    ui.battleLeader.replaceChildren(crown, leaderText, leaderScore);
    ui.battleScoreboard.replaceChildren(...players.map((player) => {
      const item = document.createElement('div'); item.className = `scoreboard-player${player.id === battleSession?.playerId ? ' me' : ''}`;
      const avatar = document.createElement('span'); avatar.className = 'animal-avatar small'; avatar.textContent = avatarFor(player); const body = document.createElement('div'); const name = document.createElement('span'); name.textContent = player.nickname; const score = document.createElement('strong'); score.textContent = `이번 판 ${player.score}개`; const total = document.createElement('small'); total.textContent = `누적 ${player.totalCorrect} · 우승 ${player.matchWins}`; body.append(name, score, total); item.append(avatar, body); return item;
    }));
  }
  function renderBattleChat(room) {
    const messages = room.match?.chat || [];
    if (!messages.length) {
      const empty = document.createElement('li'); empty.className = 'battle-chat-empty'; empty.textContent = '아직 채팅이 없어요. 정답을 입력하면 바로 판정돼요!';
      ui.battleChatList.replaceChildren(empty);
      return;
    }
    const players = new Map(room.players.map((player) => [player.id, player]));
    ui.battleChatList.replaceChildren(...messages.map((chat) => {
      const player = players.get(chat.playerId); const mine = chat.playerId === battleSession?.playerId;
      const item = document.createElement('li'); item.className = `battle-chat-message${mine ? ' mine' : ''}${chat.kind === 'correct' ? ' correct' : ''}`;
      const avatar = document.createElement('span'); avatar.className = 'animal-avatar small'; avatar.textContent = avatarFor(player || { id: chat.playerId, nickname: chat.nickname || '?' });
      const bubble = document.createElement('div'); bubble.className = 'battle-chat-bubble';
      const sender = document.createElement('strong'); sender.textContent = chat.kind === 'correct' ? `⚡ ${chat.nickname || player?.nickname || '참가자'} 정답!` : (chat.nickname || player?.nickname || '참가자');
      const text = document.createElement('p'); text.textContent = chat.text;
      bubble.append(sender, text); item.append(avatar, bubble); return item;
    }));
    ui.battleChatList.scrollTop = ui.battleChatList.scrollHeight;
  }
  function renderBattleGame(room) {
    const match = room.match; const current = match?.image ? match : null; show('battle-game'); renderBattleScoreboard(room); renderBattleChat(room);
    updateReportButton(ui.battleReport, current ? { id: match.questionId } : null);
    ui.battleCategoryLabel.textContent = battleVersionLabel(room.settings); ui.battleRound.textContent = `${match?.roundIndex || 1} / ${match?.targetRounds || ROUND_SIZE}`;
    const isNewRound = current && battleLastRoundId !== `${match.id}-${match.roundIndex}-${match.opensAt}`;
    if (isNewRound) { battleLastRoundId = `${match.id}-${match.roundIndex}-${match.opensAt}`; ui.battleInput.value = ''; ui.battleFeedback.textContent = ''; ui.battleReveal.classList.add('is-hidden'); }
    if (current && (isNewRound || imageReady(match.image))) ui.battleImage = bindQuestionImage(ui.battleImage, ui.battleStage, ui.battleLoading, match.image);
    const starting = room.state === 'preparing' || room.state === 'countdown';
    ui.battleStage.classList.toggle('battle-preparing', starting);
    ui.battleStage.classList.toggle('battle-countdown', room.state === 'countdown');
    ui.battleStage.dataset.phase = room.state;
    if (starting) {
      ui.battleStage.classList.remove('image-error'); ui.battleStage.classList.toggle('loading', room.state === 'preparing'); ui.battleLoading.classList.remove('is-hidden'); ui.battleForm.classList.remove('is-hidden'); ui.battleReveal.classList.add('is-hidden');
      ui.battleLoading.textContent = room.state === 'countdown' ? '모두 준비 완료! 곧 시작해요' : '사진을 미리 준비하고 있어요';
    } else if (room.state === 'active') {
      ui.battleForm.classList.remove('is-hidden'); ui.battleReveal.classList.add('is-hidden');
    } else if (room.state === 'reveal') {
      ui.battleForm.classList.remove('is-hidden'); ui.battleStage.classList.remove('loading'); ui.battleLoading.classList.add('is-hidden'); ui.battleResultLabel.textContent = match.winnerPlayerId ? '정답!' : '시간 초과!'; ui.battleResultLabel.className = `result-label${match.winnerPlayerId ? '' : ' timeout'}`; ui.battleAnswerLabel.textContent = match.answer || ''; const winner = room.players.find((player) => player.id === match.winnerPlayerId); ui.battleWinner.textContent = winner ? `${winner.nickname}님이 먼저 맞혔어요!` : '이번 문제는 정답자가 없어요.'; ui.battleReveal.classList.remove('is-hidden');
    }
    updateBattleClock();
    if (battleFocusAfterSend && room.state !== 'preparing') {
      requestAnimationFrame(() => {
        if (battleFocusAfterSend && currentScreen === 'battle-game' && !ui.battleInput.disabled) ui.battleInput.focus({ preventScroll: true });
        battleFocusAfterSend = false;
      });
    }
  }
  function updateBattleClock() {
    cancelAnimationFrame(battleRaf); const tick = () => {
      const room = battleRoom; const match = room?.match; if (!room || !match || currentScreen !== 'battle-game') return;
      const now = battleClockAnchor.serverNow + performance.now() - battleClockAnchor.receivedAt; let remaining = 0;
      if (room.state === 'preparing') {
        ui.battleTimer.textContent = '–'; ui.battleInput.disabled = true; ui.battleSubmit.disabled = true; ui.battleInput.placeholder = '사진을 준비하고 있어요';
        const preparation = battlePreparation;
        const preparedCount = room.players.filter((player) => player.imagesReady).length;
        ui.battleLoading.textContent = preparation?.done && preparation.loaded === preparation.total ? `다른 참가자의 사진을 기다리고 있어요 (${preparedCount}/${room.players.length}명 준비 완료)` : `사진을 미리 준비하고 있어요 (${preparation?.loaded || 0}/${preparation?.total || 0})`;
      } else if (room.state === 'countdown') { remaining = Math.max(0, room.countdownEndsAt - now); ui.battleTimer.textContent = String(Math.max(1, Math.ceil(remaining / 1000))); ui.battleInput.disabled = false; ui.battleSubmit.disabled = false; ui.battleInput.placeholder = '대결 시작 전 채팅'; }
      else if (room.state === 'active') {
        remaining = Math.max(0, match.deadline - now); const ready = imageReady(match.image) && ui.battleImage.complete && ui.battleImage.naturalWidth > 0;
        const canAnswer = now >= match.opensAt && remaining > 0 && ready; ui.battleTimer.textContent = String(Math.ceil(remaining / 1000));
        const failed = Boolean(imagePreloads.get(match.image)?.ready && !ready); const wasDisabled = ui.battleInput.disabled;
        ui.battleStage.classList.toggle('loading', !ready); ui.battleStage.classList.toggle('image-error', failed); ui.battleLoading.textContent = failed ? '사진을 불러오지 못했어요' : '사진을 다시 준비하고 있어요'; ui.battleLoading.classList.toggle('is-hidden', ready); ui.battleInput.disabled = false; ui.battleSubmit.disabled = false; ui.battleInput.placeholder = '정답 또는 채팅을 입력하세요';
        if (canAnswer && (wasDisabled || document.activeElement === document.body)) ui.battleInput.focus({ preventScroll: true });
      } else { ui.battleTimer.textContent = '–'; ui.battleInput.disabled = false; ui.battleSubmit.disabled = false; ui.battleInput.placeholder = '채팅을 입력하세요'; }
      battleRaf = requestAnimationFrame(tick);
    }; tick();
  }
  function renderBattleResult(room) {
    const match = room.match; if (!match) return; show('battle-result'); const scores = [...room.players].filter((player) => !player.leftMatch).sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
    const winners = match.winners.map((winnerId) => room.players.find((player) => player.id === winnerId)?.nickname).filter(Boolean); ui.battleWinnerSummary.textContent = winners.length ? `${winners.join(' · ')} ${winners.length > 1 ? '공동 우승!' : '우승!'}` : '이번 판은 정답자가 없어요.';
    ui.battleRanking.replaceChildren(...scores.map((player, index) => { const item = document.createElement('li'); item.className = player.id === battleSession?.playerId ? 'me' : ''; const rank = document.createElement('span'); rank.textContent = `${index + 1}`; const name = document.createElement('strong'); name.textContent = player.nickname; const score = document.createElement('em'); score.textContent = `${player.score}점`; item.append(rank, name, score); return item; }));
    ui.battleRematch.classList.toggle('is-hidden', room.hostPlayerId !== battleSession?.playerId);
  }
  function renderBattleRoom() {
    if (!battleRoom) return; if (battleRoom.state === 'lobby') renderBattleLobby(battleRoom); else if (battleRoom.state === 'finished') renderBattleResult(battleRoom); else renderBattleGame(battleRoom);
  }
  function handleBattleEvent(event) {
    if (event.type === 'session') { saveBattleSession({ roomCode: event.roomCode, playerId: event.playerId, sessionToken: event.sessionToken }); return; }
    if (event.type === 'room.snapshot') { battleRoom = event.room; battleClockAnchor = { serverNow: event.room.serverNow, receivedAt: performance.now() }; prepareBattleImages(event.room); renderBattleRoom(); return; }
    if (event.type === 'answer.result' && event.result === 'wrong') { if (event.roundId === battleRoom?.match?.roundId && battleRoom?.state === 'active') { playSound('wrong'); ui.battleFeedback.textContent = '아쉬워요, 다시!'; ui.battleInput.select(); } return; }
    if (event.type === 'notice') { notify(event.message); return; }
    if (event.type === 'room.closed' || event.type === 'session.replaced') { notify(event.message); clearBattleSession(); battleRoom = null; show('battle-entry'); return; }
    if (event.type === 'error') { ui.battleEntryFeedback.textContent = event.message; notify(event.message); return; }
  }
  function leaveBattle() {
    cancelAnimationFrame(battleRaf); clearTimeout(battleReconnectTimer); if (battleSocket?.readyState === WebSocket.OPEN && battleSession) sendBattle({ type: 'room.leave' }); battleSocket?.close(); battleSocket = null; battleRoom = null; clearBattleSession(); show('landing');
  }
  function copyBattleLink() {
    if (!battleRoom?.code) return; const link = `${location.origin}${location.pathname}?room=${battleRoom.code}`;
    navigator.clipboard?.writeText(link).then(() => notify('초대 링크를 복사했어요.')).catch(() => notify(`방 코드: ${battleRoom.code}`));
  }

  el('open-single').addEventListener('click', () => show('single-setup'));
  el('open-battle').addEventListener('click', () => { const room = new URLSearchParams(location.search).get('room'); if (room) ui.battleCode.value = room.toUpperCase(); show('battle-entry'); requestAnimationFrame(() => ui.battleNickname.focus()); });
  document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => show(button.dataset.go)));
  [ui.soundHome, ui.soundSingle, ui.soundBattle].forEach((button) => button.addEventListener('click', toggleSound));
  ui.singleCategory.addEventListener('click', (event) => { const button = event.target.closest('.category-card'); if (!button) return; singleSelected = button.dataset.category; updateSingleCategories(); });
  ui.singlePersonFilter.addEventListener('change', () => { singlePersonCategory = ui.singlePersonFilter.value; });
  ui.singleRounds.addEventListener('change', updateSingleRules); ui.singleSeconds.addEventListener('change', updateSingleRules);
  ui.singleMode.addEventListener('click', (event) => { const button = event.target.closest('.mode-card'); if (!button) return; singleMode = button.dataset.mode; updateSingleModes(); });
  ui.singleStart.addEventListener('click', startSingleGame); ui.singleForm.addEventListener('submit', (event) => { event.preventDefault(); submitSingleAnswer(); }); ui.singleCorrect.addEventListener('click', correctSingleAndAdvance); ui.singlePass.addEventListener('click', () => revealSingle('pass')); ui.singlePause.addEventListener('click', pauseSingle); ui.singleNext.addEventListener('click', () => single && (single.results.length >= single.target ? endSingleGame() : nextSingleQuestion()));
  ui.singleReport.addEventListener('click', () => reportQuestion(single?.question, 'single', ui.singleReport));
  el('single-again').addEventListener('click', startSingleGame); el('single-exit').addEventListener('click', () => { stopSingleTimer(); single = null; show('single-setup'); });
  el('battle-create').addEventListener('click', () => beginBattle({ type: 'room.create', settings: { category: 'person', personCategory: 'person' } }));
  el('battle-join').addEventListener('click', () => beginBattle({ type: 'room.join', roomCode: ui.battleCode.value.toUpperCase() }));
  ui.battleCode.addEventListener('input', () => { ui.battleCode.value = ui.battleCode.value.toUpperCase().replace(/[^A-Z2-9]/g, ''); });
  ui.battleCode.addEventListener('keydown', (event) => { if (event.key === 'Enter') el('battle-join').click(); }); ui.battleNickname.addEventListener('keydown', (event) => { if (event.key === 'Enter') el('battle-create').click(); });
  function sendBattleSettings(changes = {}) { if (!battleRoom) return; sendBattle({ type: 'room.settings', settings: { ...battleRoom.settings, ...changes } }); }
  ui.battleCategory.addEventListener('click', (event) => { const button = event.target.closest('.category-card'); if (!button || button.disabled || !battleRoom) return; sendBattleSettings({ category: button.dataset.category }); });
  ui.battlePersonFilter.addEventListener('change', () => sendBattleSettings({ personCategory: ui.battlePersonFilter.value }));
  ui.battleRounds.addEventListener('change', () => sendBattleSettings({ roundCount: Number(ui.battleRounds.value) }));
  ui.battleReady.addEventListener('click', () => { const me = getBattleMe(); if (me) sendBattle({ type: 'player.ready', ready: !me.ready }); }); ui.battleStart.addEventListener('click', () => sendBattle({ type: 'match.start' })); el('battle-leave').addEventListener('click', leaveBattle); el('battle-game-leave').addEventListener('click', leaveBattle); el('battle-result-leave').addEventListener('click', leaveBattle); el('battle-copy-link').addEventListener('click', copyBattleLink); ui.battleRematch.addEventListener('click', () => sendBattle({ type: 'match.rematch' }));
  ui.battleReport.addEventListener('click', () => reportQuestion(battleRoom?.match?.questionId ? { id: battleRoom.match.questionId } : null, 'battle', ui.battleReport));
  ui.battleForm.addEventListener('compositionstart', () => { battleComposing = true; }); ui.battleForm.addEventListener('compositionend', () => { battleComposing = false; }); ui.battleForm.addEventListener('submit', (event) => { event.preventDefault(); if (battleComposing || !battleRoom?.match || ui.battleInput.disabled) return; const text = ui.battleInput.value.trim(); if (!text) return; ui.battleFeedback.textContent = ''; ui.battleInput.value = ''; battleFocusAfterSend = true; sendBattle({ type: 'chat.send', matchId: battleRoom.match.id, roundId: battleRoom.match.roundId, text }); });
  document.addEventListener('keydown', (event) => {
    if (event.repeat || !single || currentScreen !== 'single-game') return; const typing = document.activeElement === ui.singleInput && single.state === 'playing'; if (typing) return;
    if (event.key === 'Enter') { if (single.state === 'playing' && single.mode === 'group') { event.preventDefault(); correctSingleAndAdvance(); } else if (single.state === 'revealed') { event.preventDefault(); single.results.length >= single.target ? endSingleGame() : nextSingleQuestion(); } }
    if (event.code === 'Space') { event.preventDefault(); if (single.state === 'playing') revealSingle('pass'); else if (single.state === 'revealed') single.results.length >= single.target ? endSingleGame() : nextSingleQuestion(); }
    if (event.key.toLowerCase() === 'p' && ['playing', 'paused'].includes(single.state)) { event.preventDefault(); pauseSingle(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && single?.state === 'playing' && currentScreen === 'single-game') { pauseSingle(); notify('화면을 벗어나 일시정지했어요.'); } });

  renderSoundButtons(); updateSingleCategories(); updateSingleModes(); updateSingleRules();
  fetch('./assets/questions.json?v=2.5.3').then((response) => { if (!response.ok) throw new Error('question data'); return response.json(); }).then((payload) => {
    for (const category of ['korean', 'global', 'character', 'object']) DATA[category] = payload.items.filter((item) => item.gameGroup === category && item.reviewed);
    DATA.person = [...DATA.korean, ...DATA.global, ...DATA.character]; DATA.mixed = [...DATA.person, ...DATA.object]; ui.singleStart.disabled = false; ui.singleStart.textContent = '게임 시작 →';
  }).catch(() => { ui.singleStart.textContent = '사진을 불러오지 못했어요'; notify('페이지를 새로고침해 주세요.'); });
  const invitedRoom = new URLSearchParams(location.search).get('room');
  if (invitedRoom) { ui.battleCode.value = invitedRoom.toUpperCase().replace(/[^A-Z2-9]/g, ''); show('battle-entry'); }
})();
