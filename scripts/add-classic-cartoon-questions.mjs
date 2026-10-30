import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const OUTPUT_DIR = path.join(ROOT, 'dist', 'assets', 'images', 'character');
const USER_AGENT = 'SamsamPartyGame/2.3 (public-license character pack)';

const candidates = [
  ['펠릭스 더 캣', 'Felix the Cat', ['펠릭스']],
  ['코코 더 클라운', 'Koko the Clown', ['코코']],
  ['리틀 니모', 'Little Nemo', ['니모']],
  ['크레이지 캣', 'Krazy Kat', []],
  ['옐로 키드', 'The Yellow Kid', []],
  ['버스터 브라운', 'Buster Brown', []],
  ['머트와 제프', 'Mutt and Jeff', ['머트 앤 제프']],
  ['거티', 'Gertie the Dinosaur', ['거티 더 다이노소어']],
  ['파머 알 팔파', 'Farmer Al Falfa', []],
  ['플립 더 프로그', 'Flip the Frog', ['플립']],
  ['캣젠재머 키즈', 'The Katzenjammer Kids', []],
  ['보스코', 'Bosko', []],
  ['앨리스', "Alice (Alice's Adventures in Wonderland)", ['이상한 나라의 앨리스']],
  ['흰 토끼', "White Rabbit (Alice's Adventures in Wonderland)", ['화이트 래빗']],
  ['캐터필러', "Caterpillar (Alice's Adventures in Wonderland)", ['애벌레']],
  ['트위들덤과 트위들디', 'Tweedledum and Tweedledee', []],
  ['도로시', 'Dorothy Gale', []],
  ['겁쟁이 사자', 'Cowardly Lion', ['오즈의 사자']],
  ['매드 해터', 'Mad Hatter', ['모자장수']],
  ['하트 여왕', 'Queen of Hearts (Alice\'s Adventures in Wonderland)', ['퀸 오브 하츠']],
  ['3월 토끼', 'March Hare', []],
  ['험프티 덤프티', 'Humpty Dumpty', []]
];

const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
const titleKey = (value) => String(value).replace(/^.*?:/, '').replaceAll('_', ' ').toLowerCase();
const extensionFor = (mime) => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[mime] || 'jpg');
const allowedLicense = (license) => /CC|Creative Commons|Public domain|퍼블릭 도메인|CC0/i.test(license);

async function api(host, params) {
  const body = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params });
  const response = await fetch(`https://${host}/w/api.php`, { method: 'POST', headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error(`${host}: ${response.status}`);
  return response.json();
}

const source = await api('en.wikipedia.org', { prop: 'pageimages', piprop: 'name', redirects: '1', titles: candidates.map((item) => item[1]).join('|') });
const redirects = new Map([...(source.query?.normalized || []), ...(source.query?.redirects || [])].map((item) => [item.from, item.to]));
const pageByTitle = new Map((source.query?.pages || []).map((page) => [page.title, page]));
const resolvedTitle = (title) => redirects.get(title) || title;
const resolved = candidates.map((candidate) => ({ candidate, page: pageByTitle.get(resolvedTitle(candidate[1])) }));
const fileTitles = resolved.flatMap(({ page }) => page?.pageimage ? [`File:${page.pageimage.replace(/^File:/i, '')}`] : []);
const imageInfo = await api('commons.wikimedia.org', { prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '900', titles: fileTitles.join('|') });
const infoByTitle = new Map((imageInfo.query?.pages || []).map((page) => [titleKey(page.title), page.imageinfo?.[0]]));
const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
payload.items = payload.items.filter((item) => !item.id.startsWith('character-classic-'));
await mkdir(OUTPUT_DIR, { recursive: true });

let nextNumber = 1;
const added = [];
for (const { candidate, page } of resolved) {
  const [answer, pageTitle, accepted] = candidate;
  const fileTitle = page?.pageimage ? `File:${page.pageimage.replace(/^File:/i, '')}` : null;
  const info = fileTitle ? infoByTitle.get(titleKey(fileTitle)) : null;
  const meta = info?.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value || meta.License?.value || 'Unknown');
  if (!info?.thumburl || !allowedLicense(license)) {
    console.log(`SKIP ${answer}: ${fileTitle || '대표 이미지 없음'} / ${license}`);
    continue;
  }
  const id = `character-classic-${String(nextNumber).padStart(2, '0')}`;
  const ext = extensionFor(info.thumbmime || info.mime);
  const response = await fetch(info.thumburl, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok) { console.log(`SKIP ${answer}: 다운로드 ${response.status}`); continue; }
  const file = `${id}.${ext}`;
  await writeFile(path.join(OUTPUT_DIR, file), Buffer.from(await response.arrayBuffer()));
  const item = {
    id, category: 'character', difficulty: 'hard', answer, accepted, page: pageTitle,
    image: `./assets/images/character/${file}`, fileTitle, downloadUrl: info.thumburl,
    sourceUrl: info.descriptionurl, author: stripHtml(meta.Artist?.value || meta.Credit?.value || 'Wikimedia contributor'),
    license, licenseUrl: meta.LicenseUrl?.value || '', mime: info.thumbmime || info.mime || 'image/jpeg', reviewed: false, gameGroup: 'character'
  };
  payload.items.push(item); added.push(item); nextNumber += 1;
  console.log(`ADD ${answer}: ${fileTitle} (${license})`);
}

payload.generatedAt = new Date().toISOString();
payload.reviewedAt = payload.reviewedAt || null;
await writeFile(DATA_PATH, JSON.stringify(payload, null, 2));
console.log(`추가 후보 다운로드 완료: ${added.length}장`);
