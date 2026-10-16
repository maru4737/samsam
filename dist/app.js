(() => {
  const ROUND_SIZE = 10;
  const DURATION = 5000;
  const el = (id) => document.getElementById(id);
  const ui = {
    home: el('home-screen'), game: el('game-screen'), result: el('result-screen'),
    category: el('category-label'), round: el('round-label'), score: el('score-label'),
    timer: el('timer-number'), bar: el('timer-bar'), stage: el('question-stage'), image: el('question-image'),
    objectVisual: el('object-visual'), loading: el('loading-text'), cover: el('cover-layer'),
    reveal: el('reveal-panel'), resultLabel: el('result-label'), answer: el('answer-label'), accepted: el('accepted-label'),
    correct: el('correct-button'), pass: el('pass-button'), pause: el('pause-button'), next: el('next-button'),
    finalScore: el('final-score'), summary: el('result-summary'), correctCount: el('correct-count'),
    passCount: el('pass-count'), timeoutCount: el('timeout-count'), toast: el('toast')
  };

  // Celebrity images are fetched from Korean Wikipedia's documented page-summary endpoint.
  // The item itself remains playable when a remote image is unavailable.
  const CELEBRITIES = [
    ['아이유', '아이유'], ['유재석', '유재석'], ['손흥민', '손흥민'], ['김연아', '김연아'],
    ['박보검', '박보검'], ['한소희', '한소희'], ['공유', '공유'], ['제니', '제니'],
    ['송강호', '송강호'], ['전지현', '전지현'], ['임영웅', '임영웅'], ['카리나', '카리나'],
    ['차은우', '차은우'], ['김태리', '김태리'], ['박서준', '박서준'], ['안유진', '안유진']
  ].map(([answer, page]) => ({ id: `c-${answer}`, type: 'celebrity', answer, page, accepted: [] }));

  const OBJECTS = [
    ['헤어드라이어', '💨', ['드라이기', '드라이어']], ['주전자', '🫖', []], ['가위', '✂️', []],
    ['망원경', '🔭', []], ['우산', '☂️', []], ['카메라', '📷', []], ['전구', '💡', []],
    ['자물쇠', '🔒', []], ['전화기', '☎️', []], ['소화기', '🧯', []], ['현미경', '🔬', []],
    ['나침반', '🧭', []], ['톱', '🪚', []], ['열쇠', '🔑', []], ['안경', '👓', []], ['시계', '⏰', []]
  ].map(([answer, emoji, accepted]) => ({ id: `o-${answer}`, type: 'object', answer, emoji, accepted }));
  const DATA = { celebrity: CELEBRITIES, object: OBJECTS };
  const labels = { celebrity: '연예인 이름 맞히기', object: '사물 이름 맞히기' };

  let selected = 'celebrity';
  let game = null;
  let toastTimer = null;

  const shuffled = (list) => {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  };
  const keyFor = (category) => `samsam-queue-v1-${category}`;
  function queueFor(category) {
    const all = DATA[category].map(({ id }) => id);
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(keyFor(category))); } catch (_) { /* use fresh queue */ }
    let queue = Array.isArray(stored?.queue) ? stored.queue.filter((id) => all.includes(id)) : [];
    let seen = Array.isArray(stored?.seen) ? stored.seen.filter((id) => all.includes(id)) : [];
    const known = new Set([...queue, ...seen]);
    const additions = all.filter((id) => !known.has(id));
    if (queue.length === 0) {
      queue = shuffled([...seen, ...additions]);
      const last = stored?.last;
      if (queue.length > 1 && queue[0] === last) [queue[0], queue[1]] = [queue[1], queue[0]];
      seen = [];
    } else if (additions.length) queue.push(...shuffled(additions));
    return { queue, seen, last: stored?.last || null };
  }
  function saveQueue(category, data) { try { localStorage.setItem(keyFor(category), JSON.stringify(data)); } catch (_) { /* storage is optional */ } }
  function takeQuestion(category, excluded) {
    let store = queueFor(category);
    const all = DATA[category];
    for (let tries = 0; tries < all.length * 3; tries += 1) {
      if (!store.queue.length) { store = { queue: shuffled(store.seen), seen: [], last: store.last }; if (store.queue.length > 1 && store.queue[0] === store.last) [store.queue[0], store.queue[1]] = [store.queue[1], store.queue[0]]; }
      const id = store.queue.shift();
      if (!id) return null;
      if (excluded.has(id)) { store.queue.push(id); continue; }
      const question = all.find((item) => item.id === id);
      if (!question) continue;
      store.seen.push(id); store.last = id; saveQueue(category, store);
      return question;
    }
    return null;
  }
  function show(screen) { [ui.home, ui.game, ui.result].forEach((node) => node.classList.toggle('is-hidden', node !== screen)); }
  function notify(message) { ui.toast.textContent = message; ui.toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('visible'), 2200); }
  function categoryButtons() { return [...document.querySelectorAll('.category-card')]; }
  function setControls(state) {
    const playing = state === 'playing';
    ui.correct.classList.toggle('is-hidden', !playing); ui.pass.classList.toggle('is-hidden', !playing);
    ui.pause.classList.toggle('is-hidden', !(playing || state === 'paused'));
    ui.pause.innerHTML = state === 'paused' ? '<span aria-hidden="true">▶</span> 계속하기' : '<span aria-hidden="true">Ⅱ</span> 일시정지';
    ui.next.classList.toggle('is-hidden', state !== 'revealed');
  }
  function resetQuestionUi() {
    ui.stage.classList.add('loading'); ui.loading.classList.remove('is-hidden'); ui.reveal.classList.add('is-hidden');
    ui.cover.classList.add('is-hidden'); ui.image.removeAttribute('src'); ui.image.classList.remove('is-hidden');
    ui.objectVisual.classList.remove('active'); ui.timer.textContent = '5'; ui.bar.style.transform = 'scaleX(1)';
  }
  async function loadVisual(question) {
    if (question.type === 'object') { ui.objectVisual.textContent = question.emoji; ui.objectVisual.classList.add('active'); return true; }
    const source = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(question.page)}`;
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('summary request failed');
      const json = await response.json(); const url = json.originalimage?.source || json.thumbnail?.source;
      if (!url) throw new Error('no image');
      await new Promise((resolve, reject) => { ui.image.onload = resolve; ui.image.onerror = reject; ui.image.src = url; });
      return true;
    } catch (_) {
      ui.image.classList.add('is-hidden');
      ui.objectVisual.textContent = '✦'; ui.objectVisual.classList.add('active');
      notify('사진을 불러오지 못해 대체 화면으로 진행합니다.');
      return false;
    }
  }
  function startTimer() {
    game.deadline = performance.now() + game.remaining;
    const tick = () => {
      if (!game || game.state !== 'playing') return;
      game.remaining = Math.max(0, game.deadline - performance.now());
      const seconds = Math.max(1, Math.ceil(game.remaining / 1000));
      ui.timer.textContent = String(seconds); ui.bar.style.transform = `scaleX(${game.remaining / DURATION})`;
      if (game.remaining <= 0) { reveal('timeout'); return; }
      game.raf = requestAnimationFrame(tick);
    };
    game.raf = requestAnimationFrame(tick);
  }
  function stopTimer() { if (game?.raf) cancelAnimationFrame(game.raf); if (game) game.raf = null; }
  async function nextQuestion() {
    if (!game) return;
    stopTimer(); game.state = 'loading'; setControls('loading'); resetQuestionUi();
    const question = takeQuestion(game.category, game.roundIds);
    if (!question) { endGame(); return; }
    game.question = question; game.roundIds.add(question.id);
    ui.round.textContent = `${game.results.length + 1} / ${game.target}`;
    await loadVisual(question);
    if (!game || game.question !== question) return;
    ui.stage.classList.remove('loading'); ui.loading.classList.add('is-hidden'); game.remaining = DURATION; game.state = 'playing'; setControls('playing'); startTimer();
  }
  function reveal(kind) {
    if (!game || game.state !== 'playing') return;
    stopTimer(); game.state = 'revealed'; game.results.push(kind);
    ui.score.textContent = String(game.results.filter((item) => item === 'correct').length);
    ui.resultLabel.textContent = kind === 'correct' ? '정답!' : kind === 'pass' ? '패스' : '시간 초과!';
    ui.resultLabel.className = `result-label ${kind === 'timeout' ? 'timeout' : kind === 'pass' ? 'pass' : ''}`;
    ui.answer.textContent = game.question.answer;
    ui.accepted.textContent = game.question.accepted.length ? `인정 답안: ${game.question.accepted.join(', ')}` : '';
    ui.reveal.classList.remove('is-hidden'); setControls('revealed');
    ui.next.textContent = game.results.length >= game.target ? '결과 보기 →' : '다음 문제 →';
  }
  function pause() {
    if (!game) return;
    if (game.state === 'playing') { stopTimer(); game.state = 'paused'; ui.cover.classList.remove('is-hidden'); setControls('paused'); }
    else if (game.state === 'paused') { game.state = 'playing'; ui.cover.classList.add('is-hidden'); setControls('playing'); startTimer(); }
  }
  function startGame() {
    game = { category: selected, state: 'loading', question: null, remaining: DURATION, deadline: 0, raf: null, results: [], target: Math.min(ROUND_SIZE, DATA[selected].length), roundIds: new Set() };
    ui.category.textContent = labels[selected]; ui.score.textContent = '0'; show(ui.game); nextQuestion();
  }
  function endGame() {
    if (!game) return;
    stopTimer(); const counts = { correct: 0, pass: 0, timeout: 0 }; game.results.forEach((item) => { counts[item] += 1; });
    ui.finalScore.textContent = counts.correct; ui.summary.textContent = `${game.results.length}문제 중 ${counts.correct}문제를 맞혔어요.`;
    ui.correctCount.textContent = counts.correct; ui.passCount.textContent = counts.pass; ui.timeoutCount.textContent = counts.timeout; show(ui.result);
  }
  categoryButtons().forEach((button) => button.addEventListener('click', () => { selected = button.dataset.category; categoryButtons().forEach((item) => { const active = item === button; item.classList.toggle('selected', active); item.setAttribute('aria-checked', String(active)); }); }));
  el('start-button').addEventListener('click', startGame); ui.correct.addEventListener('click', () => reveal('correct')); ui.pass.addEventListener('click', () => reveal('pass'));
  ui.pause.addEventListener('click', pause); ui.next.addEventListener('click', () => game && (game.results.length >= game.target ? endGame() : nextQuestion()));
  el('again-button').addEventListener('click', startGame); el('home-button').addEventListener('click', () => { game = null; show(ui.home); });
  el('exit-button').addEventListener('click', () => { if (game?.state === 'playing') pause(); if (!game || confirm('게임을 나가면 이번 판 점수는 사라집니다.')) { stopTimer(); game = null; show(ui.home); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game?.state === 'playing') { pause(); notify('화면을 벗어나 일시정지했어요.'); } });
  document.addEventListener('keydown', (event) => {
    if (event.repeat || !game || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'Enter' && game.state === 'playing') { event.preventDefault(); reveal('correct'); }
    if (event.code === 'Space') { event.preventDefault(); if (game.state === 'playing') reveal('pass'); else if (game.state === 'revealed') game.results.length >= game.target ? endGame() : nextQuestion(); }
    if (event.key.toLowerCase() === 'p' && ['playing', 'paused'].includes(game.state)) { event.preventDefault(); pause(); }
  });
})();
