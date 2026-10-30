import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const IMAGE_ROOT = path.join(ROOT, 'dist', 'assets', 'images');
const USER_AGENT = 'SamsamPartyGame/2.0 (personal project; Wikimedia attribution build)';

const packs = {
  celebrity: [
    ['봉준호', '봉준호', []], ['박찬욱', '박찬욱', []], ['최민식', '최민식', []],
    ['황정민', '황정민 (배우)', []], ['전도연', '전도연', []], ['손예진', '손예진', []],
    ['김고은', '김고은', []], ['라미란', '라미란', []], ['김수현', '김수현 (1988년)', []],
    ['송중기', '송중기', []], ['정해인', '정해인', []], ['류승룡', '류승룡', []],
    ['유해진', '유해진', []], ['김윤석', '김윤석 (배우)', []], ['문소리', '문소리', []],
    ['정우성', '정우성', []], ['오드리 헵번', '오드리 헵번', ['오드리 햅번']],
    ['찰리 채플린', '찰리 채플린', ['찰리 채프린']], ['마릴린 먼로', '마릴린 먼로', []],
    ['톰 크루즈', '톰 크루즈', []], ['레오나르도 디카프리오', '레오나르도 디카프리오', ['디카프리오']],
    ['비욘세', '비욘세', ['비욘세 놀스']], ['테일러 스위프트', '테일러 스위프트', ['테일러']],
    ['키아누 리브스', '키아누 리브스', []]
  ],
  history: [
    ['세종대왕', '조선 세종', ['세종', '이도']], ['이순신', '이순신', ['충무공']],
    ['신사임당', '신사임당', []], ['정약용', '정약용', ['다산 정약용']],
    ['안중근', '안중근', []], ['유관순', '유관순', []], ['김구', '김구', ['백범 김구']],
    ['윤봉길', '윤봉길', []], ['이황', '이황', ['퇴계 이황', '퇴계']], ['이이', '이이', ['율곡 이이', '율곡']],
    ['나폴레옹', '나폴레옹 보나파르트', ['나폴레옹 보나파르트']],
    ['율리우스 카이사르', '율리우스 카이사르', ['카이사르', '시저']],
    ['클레오파트라', '클레오파트라 7세 필로파토르', ['클레오파트라 7세']],
    ['에이브러햄 링컨', '에이브러햄 링컨', ['링컨']], ['알베르트 아인슈타인', '알베르트 아인슈타인', ['아인슈타인']],
    ['마리 퀴리', '마리 퀴리', ['퀴리 부인']], ['윌리엄 셰익스피어', '윌리엄 셰익스피어', ['셰익스피어']],
    ['루트비히 판 베토벤', '루트비히 판 베토벤', ['베토벤']], ['볼프강 아마데우스 모차르트', '볼프강 아마데우스 모차르트', ['모차르트']],
    ['빈센트 반 고흐', '빈센트 반 고흐', ['반 고흐', '고흐']], ['레오나르도 다 빈치', '레오나르도 다 빈치', ['다 빈치']],
    ['마하트마 간디', '마하트마 간디', ['간디']], ['니콜라 테슬라', '니콜라 테슬라', ['테슬라']],
    ['찰스 다윈', '찰스 다윈', ['다윈']], ['아이작 뉴턴', '아이작 뉴턴', ['뉴턴']],
    ['잔 다르크', '잔 다르크', ['성녀 잔 다르크']], ['조지 워싱턴', '조지 워싱턴', ['워싱턴']],
    ['갈릴레오 갈릴레이', '갈릴레오 갈릴레이', ['갈릴레이']]
  ],
  character: [
    ['미키 마우스', '미키 마우스', ['미키']], ['뽀빠이', '뽀빠이', []],
    ['곰돌이 푸', '곰돌이 푸', ['위니 더 푸', '푸']], ['피노키오', '피노키오', []],
    ['앨리스', '이상한 나라의 앨리스', ['이상한 나라의 앨리스']], ['체셔 고양이', '체셔 고양이', ['체셔 캣']],
    ['흰 토끼', '흰 토끼 (이상한 나라의 앨리스)', ['화이트 래빗']], ['빨간 모자', '빨간 두건', ['빨간 두건']],
    ['신데렐라', '신데렐라', []], ['백설공주', '백설 공주', ['백설 공주']], ['라푼젤', '라푼젤', []],
    ['장화 신은 고양이', '장화 신은 고양이', []], ['피터 래빗', '피터 래빗', []],
    ['셜록 홈즈', '셜록 홈즈', ['홈즈']], ['드라큘라', '드라큘라 백작', ['드라큘라 백작']],
    ['프랑켄슈타인의 괴물', '프랑켄슈타인의 괴물', ['프랑켄슈타인']],
    ['허수아비', '허수아비 (오즈의 마법사)', ['오즈의 허수아비']], ['양철 나무꾼', '양철 나무꾼', ['양철 인간']],
    ['도로시', '도로시 게일', ['도로시 게일']], ['피터 팬', '피터 팬', []]
  ],
  object: [
    ['버니어 캘리퍼스', '버니어 캘리퍼스', ['노기스', '캘리퍼스']], ['육분의', '육분의', []],
    ['타자기', '타자기', []], ['축음기', '축음기', ['유성기', '그래머폰']], ['메트로놈', '메트로놈', []],
    ['주판', '주판', []], ['돋보기', '돋보기', ['확대경']], ['깔때기', '깔때기', []], ['절구', '절구', []],
    ['강판', '강판 (도구)', ['채칼']], ['거품기', '거품기', ['휘핑기']], ['국자', '국자 (도구)', []],
    ['렌치', '렌치', ['스패너']], ['펜치', '펜치', ['플라이어']], ['대패', '대패 (도구)', []],
    ['끌', '끌 (도구)', []], ['송곳', '송곳', []], ['실톱', '실톱', []], ['줄자', '줄자', ['테이프 자']],
    ['수평계', '수평계', []], ['각도기', '각도기', []], ['컴퍼스', '컴퍼스 (제도)', ['제도용 컴퍼스']],
    ['스포이드', '스포이트', ['스포이트', '드로퍼']], ['집게', '집게', []], ['체', '체 (도구)', ['체망']],
    ['절삭용 쇠줄', '줄 (공구)', ['쇠줄', '줄']], ['도르래', '도르래', []], ['모래시계', '모래시계', []]
  ]
};

const categoryLabels = { celebrity: '연예인', history: '역사 인물', character: '만화·동화 캐릭터', object: '사물' };
const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

async function api(params) {
  const body = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch('https://ko.wikipedia.org/w/api.php', { method: 'POST', headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded' }, body });
    if (response.ok) return response.json();
    if (response.status !== 429) throw new Error(`${response.status} MediaWiki API`);
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
  }
  throw new Error('MediaWiki API 요청 제한');
}

function resolvedTitle(original, query) {
  let current = original;
  for (let step = 0; step < 5; step += 1) {
    const next = query.normalized?.find((item) => item.from === current)?.to || query.redirects?.find((item) => item.from === current)?.to;
    if (!next || next === current) break;
    current = next;
  }
  return current;
}
const imageKey = (title) => String(title).replace(/^.*?:/, '').replaceAll('_', ' ').toLowerCase();
const extensionFor = (mime) => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[mime] || 'jpg');

async function metadata(entries) {
  const data = await api({ prop: 'pageimages', piprop: 'name|thumbnail|original', pithumbsize: '900', redirects: '1', titles: entries.map((x) => x[1]).join('|') });
  const query = data.query || {};
  const pages = new Map((query.pages || []).map((page) => [page.title, page]));
  const mapped = entries.map((entry, index) => ({ entry, index, page: pages.get(resolvedTitle(entry[1], query)) }));
  const titles = mapped.filter((x) => x.page?.pageimage).map((x) => x.page.pageimage.startsWith('파일:') ? x.page.pageimage : `파일:${x.page.pageimage}`);
  if (!titles.length) return mapped.map((x) => ({ ...x, error: '대표 이미지 없음' }));
  const imageData = await api({ prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '900', titles: titles.join('|') });
  const imagePages = new Map((imageData.query?.pages || []).map((page) => [imageKey(page.title), page]));
  return mapped.map((item) => {
    const { page } = item;
    if (!page?.pageimage) return { ...item, error: '대표 이미지 없음' };
    const fileTitle = page.pageimage.startsWith('파일:') ? page.pageimage : `파일:${page.pageimage}`;
    const info = imagePages.get(imageKey(fileTitle))?.imageinfo?.[0];
    if (!info?.thumburl && !info?.url) return { ...item, error: `파일 정보 없음: ${fileTitle}` };
    const meta = info.extmetadata || {};
    const license = stripHtml(meta.LicenseShortName?.value || meta.License?.value || 'Unknown');
    if (!/CC|Creative Commons|Public domain|퍼블릭 도메인|GFDL/i.test(license)) return { ...item, error: `재사용 라이선스 확인 실패 (${license}): ${fileTitle}` };
    return { ...item, imageInfo: { fileTitle, downloadUrl: info.thumburl || info.url, sourceUrl: info.descriptionurl, author: stripHtml(meta.Artist?.value || meta.Credit?.value || 'Wikimedia contributor'), license, licenseUrl: meta.LicenseUrl?.value || '', mime: info.thumbmime || info.mime || 'image/jpeg' } };
  });
}

async function downloadPack(category, entries) {
  const out = path.join(IMAGE_ROOT, category);
  await mkdir(out, { recursive: true });
  const found = await metadata(entries);
  const results = [];
  const failures = [];
  for (const item of found) {
    const [answer, page, accepted] = item.entry;
    const id = `${category}-hard-${String(item.index + 1).padStart(2, '0')}`;
    if (item.error) { failures.push({ category, answer, page, error: item.error }); console.error('FAIL', category, answer, item.error); continue; }
    const ext = extensionFor(item.imageInfo.mime);
    const filename = `${id}.${ext}`;
    const response = await fetch(item.imageInfo.downloadUrl, { headers: { 'user-agent': USER_AGENT } });
    if (!response.ok) { failures.push({ category, answer, page, error: `다운로드 ${response.status}` }); continue; }
    await writeFile(path.join(out, filename), Buffer.from(await response.arrayBuffer()));
    results.push({ id, category, difficulty: 'hard', answer, accepted, image: `./assets/images/${category}/${filename}`, page, ...item.imageInfo, reviewed: false });
    console.log('OK', category, answer, item.imageInfo.fileTitle, item.imageInfo.license);
  }
  return { results, failures };
}

const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
payload.items = payload.items.filter((item) => !item.id.includes('-hard-'));
payload.failures = (payload.failures || []).filter((item) => !item.expansion);
for (const [category, entries] of Object.entries(packs)) {
  const pack = await downloadPack(category, entries);
  payload.items.push(...pack.results);
  payload.failures.push(...pack.failures.map((item) => ({ ...item, expansion: true })));
}
payload.generatedAt = new Date().toISOString();
await writeFile(DATA_PATH, JSON.stringify(payload, null, 2));

const rows = payload.items.map((item) => `<tr><td>${escapeHtml(item.answer)}</td><td>${categoryLabels[item.category] || item.category}</td><td>${escapeHtml(item.author)}</td><td>${escapeHtml(item.license)}</td><td><a href="${escapeHtml(item.sourceUrl)}" rel="noreferrer">원본 파일</a></td></tr>`).join('\n');
await writeFile(path.join(ROOT, 'dist', 'credits.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>사진 출처 | 삼삼오오</title><link rel="stylesheet" href="./style.css"></head><body><main class="credits-page"><a href="./">← 게임으로</a><h1>사진 출처</h1><p>문제 사진은 Wikimedia 프로젝트의 공개 라이선스 이미지를 내려받아 사용했습니다. 각 사진의 저작자와 라이선스는 아래 원본 파일 페이지에서 확인할 수 있습니다.</p><div class="credits-table-wrap"><table><thead><tr><th>정답</th><th>종류</th><th>저작자</th><th>라이선스</th><th>출처</th></tr></thead><tbody>${rows}</tbody></table></div></main></body></html>`);
console.log('확장 완료', payload.items.length, '장 / 실패', payload.failures.filter((x) => x.expansion).length);
