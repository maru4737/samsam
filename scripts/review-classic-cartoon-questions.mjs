import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const IMAGE_DIR = path.join(ROOT, 'dist', 'assets', 'images', 'character');
const approvedClassic = new Set([
  'character-classic-01', 'character-classic-02', 'character-classic-04', 'character-classic-05',
  'character-classic-12', 'character-classic-13', 'character-classic-14', 'character-classic-15', 'character-hard-20'
]);
const rejectedReasons = {
  'character-classic-03': '말풍선에 정답 이름이 직접 보여 제외',
  'character-classic-06': '포스터 제목에 정답이 직접 보여 제외',
  'character-classic-07': '포스터 제목에 정답이 직접 보여 제외',
  'character-classic-08': '캐릭터 식별이 어려워 제외',
  'character-classic-09': '포스터 제목에 정답이 직접 보여 제외',
  'character-classic-10': '제목이 이미지에 직접 보여 제외',
  'character-classic-11': '검은 화면으로 확인돼 제외',
  'character-classic-16': '표지 제목에 정답이 직접 보여 제외'
};
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const categoryLabels = { celebrity: '인물 · 연예인', history: '인물 · 역사', character: '인물 · 만화·동화 캐릭터', person: '인물', object: '사물' };

const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
const rejected = payload.items.filter((item) => item.id.startsWith('character-classic-') && !approvedClassic.has(item.id));
payload.items = payload.items.filter((item) => !item.id.startsWith('character-classic-') || approvedClassic.has(item.id)).map((item) => {
  if (approvedClassic.has(item.id)) return { ...item, reviewed: true, gameGroup: 'character' };
  return item;
});
const usedFiles = new Set(payload.items.filter((item) => item.category === 'character').map((item) => path.basename(item.image || '')));
for (const file of await readdir(IMAGE_DIR)) {
  if (file.startsWith('character-classic-') && !usedFiles.has(file)) await unlink(path.join(IMAGE_DIR, file));
}
payload.reviewedAt = new Date().toISOString();
await writeFile(DATA_PATH, JSON.stringify(payload, null, 2));

const rows = payload.items.map((item) => `<tr><td>${escapeHtml(item.answer)}</td><td>${categoryLabels[item.category] || item.category}</td><td>${escapeHtml(item.author)}</td><td>${escapeHtml(item.license)}</td><td><a href="${escapeHtml(item.sourceUrl)}" rel="noreferrer">원본 파일</a></td></tr>`).join('\n');
await writeFile(path.join(ROOT, 'dist', 'credits.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>사진 출처 | 삼삼오오</title><link rel="stylesheet" href="./style.css"></head><body><main class="credits-page"><a href="./">← 게임으로</a><h1>사진 출처</h1><p>문제 사진은 Wikimedia 프로젝트의 공개 라이선스 이미지를 내려받아 사용했습니다. 각 사진의 저작자와 라이선스는 아래 원본 파일 페이지에서 확인할 수 있습니다.</p><div class="credits-table-wrap"><table><thead><tr><th>정답</th><th>종류</th><th>저작자</th><th>라이선스</th><th>출처</th></tr></thead><tbody>${rows}</tbody></table></div></main></body></html>`);
const approved = payload.items.filter((item) => approvedClassic.has(item.id));
await writeFile(path.join(ROOT, 'docs', 'CLASSIC_CHARACTER_REVIEW.md'), `# 고전 만화 캐릭터 사진 검수\n\nWikimedia의 퍼블릭 도메인 이미지 후보를 전체 썸네일로 육안 검수했다. 캐릭터 식별 가능 여부와 사진 안의 정답 직접 노출을 확인했다.\n\n## 출제 승인\n\n${approved.map((item) => `- ${item.answer}: 캐릭터가 식별 가능하고 정답 텍스트가 직접 드러나지 않음`).join('\n')}\n\n## 제외\n\n${rejected.map((item) => `- ${item.answer}: ${rejectedReasons[item.id] || '식별 또는 정답 노출 문제'}`).join('\n')}\n`);
console.log(`고전 캐릭터 승인 ${approved.length}장 / 제외 ${rejected.length}장 / 전체 캐릭터 ${payload.items.filter((item) => item.gameGroup === 'character' && item.reviewed).length}장`);
