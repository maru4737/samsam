import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, 'dist', 'assets', 'images');
const USER_AGENT = 'SamsamPartyGame/1.0 (personal project; Wikimedia attribution build)';

const celebrities = [
  ['아이유', '아이유', ['이지은']], ['유재석', '유재석', []], ['손흥민', '손흥민', []],
  ['김연아', '김연아', []], ['박보검', '박보검', []], ['한소희', '한소희', []],
  ['공유', '공유 (배우)', ['공지철']], ['제니', '제니 (1996년)', ['김제니']], ['송강호', '송강호', []],
  ['전지현', '전지현', ['왕지현']], ['임영웅', '임영웅', []], ['카리나', '카리나 (가수)', ['유지민']],
  ['차은우', '차은우', ['이동민']], ['김태리', '김태리', []], ['박서준', '박서준', []],
  ['안유진', '안유진', ['유진']], ['수지', '배수지', ['배수지']], ['이효리', '이효리', []],
  ['지드래곤', 'G-DRAGON', ['권지용', '지디', 'G-DRAGON']], ['마동석', '마동석', ['이동석', '돈 리']],
  ['박은빈', '박은빈', []], ['이정재', '이정재', []], ['김혜수', '김혜수', []],
  ['장원영', '장원영', ['원영']], ['이영지', '이영지', []], ['강호동', '강호동', []],
  ['신동엽', '신동엽 (희극인)', []], ['나영석', '나영석', ['나영석 PD', '나PD']],
  ['정국', '정국', ['전정국']], ['뷔', '뷔 (가수)', ['김태형']], ['진', '진 (가수)', ['김석진']],
  ['RM', 'RM (래퍼)', ['알엠', '김남준']], ['지수', '지수 (1995년)', ['김지수']],
  ['로제', '로제 (가수)', ['박채영']], ['리사', '리사 (태국의 가수)', ['라리사']],
  ['윈터', '윈터 (가수)', ['김민정']], ['현빈', '현빈', ['김태평']], ['이병헌', '이병헌', []],
  ['조정석', '조정석', []], ['전현무', '전현무', []], ['박명수', '박명수', []], ['이경규', '이경규', []]
];

const objects = [
  ['헤어드라이어', '헤어드라이어', ['드라이기', '드라이어']], ['주전자', '주전자', ['포트']],
  ['가위', '가위', []], ['망원경', '망원경', []], ['우산', '우산', []], ['카메라', '사진기', ['사진기']],
  ['전구', '백열등', ['백열등', '알전구']], ['자물쇠', '자물쇠', []], ['전화기', '전화기', ['전화']],
  ['소화기', '소화기', []], ['현미경', '현미경', []], ['나침반', '나침반', []], ['톱', '톱 (도구)', []],
  ['열쇠', '열쇠', ['키']], ['안경', '안경', []], ['시계', '시계', []], ['선풍기', '선풍기', []],
  ['냉장고', '냉장고', []], ['전자레인지', '전자레인지', ['전자렌지']], ['토스터', '토스터', ['토스트기']],
  ['진공청소기', '진공청소기', ['청소기']], ['계산기', '계산기', []], ['스테이플러', '스테이플러', ['호치키스']],
  ['칫솔', '칫솔', []], ['치약', '치약', []], ['망치', '망치', ['해머']], ['드라이버', '스크루드라이버', ['스크루드라이버']],
  ['체온계', '체온계', ['온도계']], ['주사위', '주사위', []], ['리모컨', '리모컨', ['원격 조종기']],
  ['다리미', '다리미', []], ['프라이팬', '프라이팬', ['후라이팬']], ['손전등', '손전등', ['플래시']],
  ['병따개', '병따개', ['오프너']], ['키보드', '컴퓨터 자판', ['자판', '컴퓨터 키보드']], ['마우스', '컴퓨터 마우스', ['컴퓨터 마우스']]
];

function stripHtml(value = '') {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
}

async function api(params) {
  const body = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch('https://ko.wikipedia.org/w/api.php', {
      method: 'POST',
      headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded' },
      body
    });
    if (response.ok) return response.json();
    if (response.status !== 429) throw new Error(`${response.status} MediaWiki API`);
    await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
  }
  throw new Error('MediaWiki API 요청 제한이 계속됨');
}

function resolveTitle(original, query) {
  let current = original;
  for (let step = 0; step < 5; step += 1) {
    const next = query.normalized?.find((item) => item.from === current)?.to || query.redirects?.find((item) => item.from === current)?.to;
    if (!next || next === current) break;
    current = next;
  }
  return current;
}

const imageKey = (title) => String(title).replace(/^.*?:/, '').replaceAll('_', ' ').toLowerCase();

async function categoryMetadata(entries) {
  const pageData = await api({
    prop: 'pageimages', piprop: 'name|thumbnail|original', pithumbsize: '900', redirects: '1',
    titles: entries.map((entry) => entry[1]).join('|')
  });
  const pageQuery = pageData.query || {};
  const pages = new Map((pageQuery.pages || []).map((page) => [page.title, page]));
  const mapped = entries.map((entry, index) => {
    const title = resolveTitle(entry[1], pageQuery);
    return { entry, index, page: pages.get(title) };
  });
  const fileTitles = mapped.filter(({ page }) => page?.pageimage).map(({ page }) => page.pageimage.startsWith('파일:') ? page.pageimage : `파일:${page.pageimage}`);
  const imageData = await api({ prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '900', titles: fileTitles.join('|') });
  const imagePages = new Map((imageData.query?.pages || []).map((page) => [imageKey(page.title), page]));

  return mapped.map(({ entry, index, page }) => {
    if (!page || page.missing || !page.pageimage) return { entry, index, error: `페이지 대표 이미지 없음: ${entry[1]}` };
    const fileTitle = page.pageimage.startsWith('파일:') ? page.pageimage : `파일:${page.pageimage}`;
    const info = imagePages.get(imageKey(fileTitle))?.imageinfo?.[0];
    if (!info?.thumburl && !info?.url) return { entry, index, error: `파일 정보 없음: ${fileTitle}` };
    const meta = info.extmetadata || {};
    const license = stripHtml(meta.LicenseShortName?.value || meta.License?.value || 'Unknown');
    const reusable = /CC|Creative Commons|Public domain|퍼블릭 도메인|GFDL/i.test(license);
    if (!reusable) return { entry, index, error: `재사용 라이선스 확인 실패 (${license}): ${fileTitle}` };
    return { entry, index, image: {
      fileTitle,
      downloadUrl: info.thumburl || info.url,
      sourceUrl: info.descriptionurl || `https://ko.wikipedia.org/wiki/${encodeURIComponent(fileTitle.replace('파일:', 'File:'))}`,
      author: stripHtml(meta.Artist?.value || meta.Credit?.value || 'Wikimedia contributor'),
      license,
      licenseUrl: meta.LicenseUrl?.value || '',
      mime: info.thumbmime || info.mime || 'image/jpeg'
    } };
  });
}

const extensionFor = (mime) => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[mime] || 'jpg');
const slug = (category, index) => `${category}-${String(index + 1).padStart(2, '0')}`;

async function downloadItem(category, entry, index, image) {
  const [answer, page, accepted] = entry;
  const ext = extensionFor(image.mime);
  const id = slug(category, index);
  const relative = `./assets/images/${category}/${id}.${ext}`;
  const destination = path.join(OUTPUT, category, `${id}.${ext}`);
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(image.downloadUrl, { headers: { 'user-agent': USER_AGENT } });
    if (response.ok) break;
    if (response.status !== 429) throw new Error(`다운로드 실패 ${response.status}: ${answer}`);
    await new Promise((resolve) => setTimeout(resolve, 1800 * (attempt + 1)));
  }
  if (!response?.ok) throw new Error(`다운로드 실패 ${response?.status || 'unknown'}: ${answer}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return { id, category, answer, accepted, image: relative, page, ...image };
}

async function runCategory(category, entries) {
  await mkdir(path.join(OUTPUT, category), { recursive: true });
  const results = [];
  const failures = [];
  const metadata = await categoryMetadata(entries);
  for (const item of metadata) {
    const { entry, index } = item;
    if (item.error) {
      failures.push({ answer: entry[0], page: entry[1], error: item.error });
      process.stderr.write(`FAIL ${category} ${entry[0]} — ${item.error}\n`);
      continue;
    }
    try {
      const downloaded = await downloadItem(category, entry, index, item.image);
      results.push(downloaded);
      process.stdout.write(`OK ${category} ${downloaded.answer} — ${downloaded.fileTitle} — ${downloaded.license}\n`);
    } catch (error) {
      failures.push({ answer: entry[0], page: entry[1], error: error.message });
      process.stderr.write(`FAIL ${category} ${entry[0]} — ${error.message}\n`);
    }
  }
  return { results, failures };
}

await mkdir(OUTPUT, { recursive: true });
const celebrity = await runCategory('celebrity', celebrities);
const object = await runCategory('object', objects);
const payload = { generatedAt: new Date().toISOString(), items: [...celebrity.results, ...object.results], failures: [...celebrity.failures, ...object.failures] };
await writeFile(path.join(ROOT, 'dist', 'assets', 'questions.json'), JSON.stringify(payload, null, 2));

const rows = payload.items.map((item) => `<tr><td>${item.answer}</td><td>${item.category === 'celebrity' ? '연예인' : '사물'}</td><td>${item.author}</td><td>${item.license}</td><td><a href="${item.sourceUrl}" rel="noreferrer">원본 파일</a></td></tr>`).join('\n');
await writeFile(path.join(ROOT, 'dist', 'credits.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>사진 출처 | 삼삼오오</title><link rel="stylesheet" href="./style.css"></head><body><main class="credits-page"><a href="./">← 게임으로</a><h1>사진 출처</h1><p>문제 사진은 Wikimedia 프로젝트의 공개 라이선스 이미지를 내려받아 사용했습니다. 각 사진의 저작자와 라이선스는 아래 원본 파일 페이지에서 확인할 수 있습니다.</p><div class="credits-table-wrap"><table><thead><tr><th>정답</th><th>종류</th><th>저작자</th><th>라이선스</th><th>출처</th></tr></thead><tbody>${rows}</tbody></table></div></main></body></html>`);

console.log(`완료: 연예인 ${celebrity.results.length}, 사물 ${object.results.length}, 실패 ${payload.failures.length}`);
if (payload.failures.length) console.log(JSON.stringify(payload.failures, null, 2));
