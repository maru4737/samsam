import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const USER_AGENT = 'SamsamPartyGame/2.0 (personal project; Wikimedia attribution build)';
const overrides = [
  { id: 'object-04', file: 'File:Dobsonian, d=114mm f=910mm, Nebo na poklon (1).jpg' },
  { id: 'object-05', file: 'File:Beige and brown oil-paper umbrella on the edge of a wooden house in Luang Prabang Laos.jpg' },
  { id: 'history-hard-11', file: 'File:Napoleon Bonaparte.jpg' },
  { id: 'history-hard-26', file: "File:Joan of Arc, three-quarter length portrait, standing in field, facing front, clutching sword to chest LCCN99401200.jpg" },
  { id: 'character-hard-02', file: 'File:Popeye el marino.jpg' },
  { id: 'character-hard-03', file: 'File:Pooh Shepard1928.jpg' },
  { id: 'character-hard-09', file: 'File:Cinderella and the Fairy Godmother.jpg' },
  { id: 'object-hard-02', file: 'File:Another view of the sextant, a navigational instrument used by the Corps of Discovery. (1da3aa0e-1dd8-b71b-0be2-624335d516b0).JPG' },
  { id: 'object-hard-09', file: 'File:White-Mortar-and-Pestle.jpg' },
  { id: 'character-hard-16', category: 'character', answer: '프랑켄슈타인의 괴물', accepted: ['프랑켄슈타인'], page: '프랑켄슈타인의 괴물', file: "File:Frankenstein's monster (Boris Karloff).jpg" },
  { id: 'character-hard-17', category: 'character', answer: '허수아비', accepted: ['오즈의 허수아비'], page: '허수아비 (오즈의 마법사)', file: 'File:Wizard of Oz scarecrow detail.png' },
  { id: 'character-hard-18', category: 'character', answer: '양철 나무꾼', accepted: ['양철 인간'], page: '양철 나무꾼', file: 'File:Tin Woodman.png' },
  { id: 'character-hard-20', category: 'character', answer: '피터 팬', accepted: [], page: '피터 팬', file: 'File:Alice B. Woodward Peter Pan.jpg' }
];

const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

const body = new URLSearchParams({
  action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo',
  iiprop: 'url|extmetadata|mime', iiurlwidth: '900', titles: overrides.map((item) => item.file).join('|')
});
const response = await fetch('https://commons.wikimedia.org/w/api.php', {
  method: 'POST', headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded' }, body
});
if (!response.ok) throw new Error(`Commons API ${response.status}`);
const pages = (await response.json()).query?.pages || [];
const titleKey = (value) => String(value).replaceAll('_', ' ').toLowerCase();
const byTitle = new Map(pages.map((page) => [titleKey(page.title), page.imageinfo?.[0]]));
const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));

for (const override of overrides) {
  let item = payload.items.find((entry) => entry.id === override.id);
  if (!item && override.category) {
    item = { id: override.id, category: override.category, difficulty: 'hard', answer: override.answer, accepted: override.accepted, page: override.page, reviewed: false };
    payload.items.push(item);
  }
  const info = byTitle.get(titleKey(override.file));
  if (!item || !info?.thumburl) throw new Error(`교체 대상 없음: ${override.id} / ${override.file}`);
  const meta = info.extmetadata || {};
  let download;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    download = await fetch(info.thumburl, { headers: { 'user-agent': USER_AGENT } });
    if (download.ok) break;
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  if (!download?.ok) throw new Error(`교체 이미지 다운로드 실패: ${override.id}`);
  const ext = ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[info.thumbmime || info.mime] || 'jpg');
  const relative = `./assets/images/${item.category}/${item.id}.${ext}`;
  if (item.image && item.image !== relative) await unlink(path.join(ROOT, 'dist', item.image.replace('./', ''))).catch(() => {});
  await writeFile(path.join(ROOT, 'dist', relative.replace('./', '')), Buffer.from(await download.arrayBuffer()));
  Object.assign(item, {
    image: relative,
    fileTitle: override.file,
    downloadUrl: info.thumburl,
    sourceUrl: info.descriptionurl,
    author: stripHtml(meta.Artist?.value || meta.Credit?.value || 'Wikimedia contributor'),
    license: stripHtml(meta.LicenseShortName?.value || meta.License?.value || 'Unknown'),
    licenseUrl: meta.LicenseUrl?.value || '',
    mime: info.thumbmime || 'image/jpeg'
  });
  console.log(`교체: ${item.answer} → ${override.file}`);
}

await writeFile(DATA_PATH, JSON.stringify(payload, null, 2));
