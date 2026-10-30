import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const IMAGE_DIR = path.join(ROOT, 'dist', 'assets', 'images', 'character');
const USER_AGENT = 'SamsamPartyGame/4.0 (Wikimedia character pack; attribution build)';

const candidates = [
  ['앨리스', "Alice (Alice's Adventures in Wonderland)", ['이상한 나라의 앨리스']],
  ['흰 토끼', "White Rabbit (Alice's Adventures in Wonderland)", ['화이트 래빗']],
  ['트위들덤과 트위들디', 'Tweedledum and Tweedledee', ['트위들덤', '트위들디']],
  ['도로시', 'Dorothy Gale', ['도로시 게일']],
  ['서쪽 마녀', 'Wicked Witch of the West', ['서쪽의 사악한 마녀']],
  ['글린다', 'Glinda the Good Witch', ['착한 마녀 글린다']],
  ['백설공주', 'Snow White', []],
  ['라푼젤', 'Rapunzel', []],
  ['헨젤과 그레텔', 'Hansel and Gretel', ['헨젤', '그레텔']],
  ['골디락스', 'Goldilocks and the Three Bears', ['금발머리 소녀']],
  ['아기 돼지 삼형제', 'The Three Little Pigs', ['세 마리 아기 돼지']],
  ['개구리 왕자', 'The Frog Prince', []],
  ['럼펠슈틸츠킨', 'Rumpelstiltskin', ['룸펠슈틸츠킨']],
  ['인어공주', 'The Little Mermaid', []],
  ['눈의 여왕', 'The Snow Queen', []],
  ['미운 오리 새끼', 'The Ugly Duckling', []],
  ['벌거벗은 임금님', "The Emperor's New Clothes", ['벌거벗은 왕']],
  ['성냥팔이 소녀', 'The Little Match Girl', []],
  ['알라딘', 'Aladdin', []],
  ['알리바바', 'Ali Baba', ['알리 바바']],
  ['신드바드', 'Sinbad the Sailor', ['선원 신드바드']],
  ['로빈 후드', 'Robin Hood', []],
  ['아서왕', 'King Arthur', ['아더왕']],
  ['멀린', 'Merlin', []],
  ['돈키호테', 'Don Quixote (character)', ['돈 키호테']],
  ['산초 판사', 'Sancho Panza', []],
  ['로빈슨 크루소', 'Robinson Crusoe', []],
  ['걸리버', 'Lemuel Gulliver', ['레뮤얼 걸리버']],
  ['타잔', 'Tarzan', []],
  ['조로', 'Zorro', []],
  ['바바 야가', 'Baba Yaga', []],
  ['베티 붑', 'Betty Boop', ['베티 부프']],
  ['오스왈드', 'Oswald the Lucky Rabbit', ['행운의 토끼 오스왈드']],
  ['거티', 'Gertie the Dinosaur', ['공룡 거티']],
  ['리틀 니모', 'Little Nemo', []],
  ['올리브 오일', 'Olive Oyl', []],
  ['윔피', 'J. Wellington Wimpy', ['웰링턴 윔피']],
  ['방랑자', 'The Tramp', ['찰리 채플린 방랑자']],
  ['네모 선장', 'Captain Nemo', []],
  ['모글리', 'Mowgli', []],
  ['정글북 발루', 'Baloo', ['발루']],
  ['검은 미녀', 'Black Beauty', ['블랙 뷰티']],
  ['두꺼비 아저씨', 'Mr. Toad', ['미스터 토드']],
  ['톰 소여', 'Tom Sawyer', []],
  ['허클베리 핀', 'Huckleberry Finn', ['허클베리핀']],
  ['에벤에셀 스크루지', 'Ebenezer Scrooge', ['스크루지']],
  ['크리스마스 유령', 'Ghost of Christmas Present', []],
  ['지킬 박사와 하이드', 'Dr. Jekyll and Mr. Hyde (character)', ['지킬 박사', '하이드']],
  ['도리언 그레이', 'Dorian Gray (character)', []],
  ['이카보드 크레인', 'Ichabod Crane', []],
];

const clean = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
const key = (value = '') => value.replace(/^(File|파일):/i, '').replaceAll('_', ' ').toLowerCase();
const extFor = (mime = '') => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[mime] || null);

async function api(params) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  for (const [name, value] of Object.entries({ action: 'query', format: 'json', formatversion: '2', origin: '*', ...params })) url.searchParams.set(name, value);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (response.ok) return response.json();
    if (response.status !== 429) throw new Error(`${response.status} Wikipedia API`);
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  throw new Error('Wikipedia API rate limit');
}

async function resolveCandidate(answer, page, accepted) {
  const pageData = await api({ prop: 'pageimages', piprop: 'name', redirects: '1', titles: page });
  const resolved = pageData.query?.pages?.[0];
  if (!resolved?.pageimage) throw new Error('대표 이미지 없음');
  const fileTitle = resolved.pageimage.startsWith('File:') ? resolved.pageimage : `File:${resolved.pageimage}`;
  const imageData = await api({ prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '900', titles: fileTitle });
  const info = imageData.query?.pages?.[0]?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) throw new Error('이미지 정보 없음');
  const meta = info.extmetadata || {};
  const license = clean(meta.LicenseShortName?.value || meta.License?.value || 'Unknown');
  if (!/CC|Creative Commons|Public domain|GFDL/i.test(license)) throw new Error(`허용되지 않은 라이선스: ${license}`);
  const mime = info.thumbmime || info.mime;
  const extension = extFor(mime);
  if (!extension) throw new Error(`지원하지 않는 형식: ${mime}`);
  if ((info.thumbwidth || info.width || 0) < 300 || (info.thumbheight || info.height || 0) < 300) throw new Error('해상도 부족');
  return { answer, page, accepted, fileTitle, downloadUrl: info.thumburl || info.url, sourceUrl: info.descriptionurl, author: clean(meta.Artist?.value || meta.Credit?.value || 'Wikimedia contributor'), license, licenseUrl: meta.LicenseUrl?.value || '', mime, width: info.thumbwidth || info.width, height: info.thumbheight || info.height, extension };
}

await mkdir(IMAGE_DIR, { recursive: true });
const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
const existingAnswers = new Set(payload.items.map((item) => item.answer));
const existingFiles = new Set(payload.items.map((item) => key(item.fileTitle)));
const added = [];
const failures = [];
let next = Math.max(0, ...payload.items.map((item) => Number(item.id.match(/^character-v4-(\d+)$/)?.[1] || 0))) + 1;

for (const [answer, page, accepted] of candidates) {
  if (existingAnswers.has(answer)) continue;
  try {
    const item = await resolveCandidate(answer, page, accepted);
    if (existingFiles.has(key(item.fileTitle))) throw new Error('이미 사용 중인 사진');
    const id = `character-v4-${String(next).padStart(3, '0')}`;
    next += 1;
    const filename = `${id}.${item.extension}`;
    const response = await fetch(item.downloadUrl, { headers: { 'user-agent': USER_AGENT } });
    if (!response.ok) throw new Error(`다운로드 실패 ${response.status}`);
    await writeFile(path.join(IMAGE_DIR, filename), Buffer.from(await response.arrayBuffer()));
    const { extension, ...metadata } = item;
    const record = { id, category: 'character', difficulty: 'hard', ...metadata, image: `./assets/images/character/${filename}`, reviewed: false, gameGroup: 'character' };
    payload.items.push(record); added.push(record); existingAnswers.add(answer); existingFiles.add(key(record.fileTitle));
    console.log(`추가 ${id} ${answer} <- ${record.fileTitle}`);
  } catch (error) {
    failures.push({ category: 'character', answer, page, error: error.message, expansionV4: true });
    console.log(`건너뜀 ${answer}: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
}

payload.failures = [...(payload.failures || []).filter((item) => !item.expansionV4), ...failures];
payload.generatedAt = new Date().toISOString();
await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ added: added.length, failures: failures.length, total: payload.items.length }));
