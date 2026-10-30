import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const IMAGE_DIR = path.join(ROOT, 'dist', 'assets', 'images', 'character');
const approved = new Set([
  'character-v4-001', 'character-v4-002', 'character-v4-003',
  'character-v4-005', 'character-v4-006', 'character-v4-007', 'character-v4-008', 'character-v4-009',
  'character-v4-010', 'character-v4-011', 'character-v4-012', 'character-v4-013', 'character-v4-014',
  'character-v4-018', 'character-v4-021', 'character-v4-024', 'character-v4-025',
  'character-v4-027', 'character-v4-028', 'character-v4-029', 'character-v4-031', 'character-v4-032',
  'character-v4-034', 'character-v4-035', 'character-v4-037'
]);
const rejectedReasons = {
  'character-v4-004': '일반 소녀 그림으로 보여 도로시 고유 특징을 식별하기 어려움',
  'character-v4-015': '평범한 중세 기마 인물처럼 보여 로빈 후드 식별이 어려움',
  'character-v4-016': '아서왕보다 여러 인물이 함께 있는 태피스트리가 중심임',
  'character-v4-017': '어두운 흑백 인물화로 멀린의 특징이 분명하지 않음',
  'character-v4-019': '산초 판사 단독 특징이 부족한 동상 사진임',
  'character-v4-020': '표지에 TARZAN 정답 글자가 직접 노출됨',
  'character-v4-022': '투명 SVG의 검은 선이 게임 배경과 겹쳐 캐릭터가 보이지 않음',
  'character-v4-023': '검은 몸통이 게임 배경과 겹쳐 캐릭터 식별이 어려움',
  'character-v4-026': '기존 찰리 채플린 문제와 사실상 중복됨',
  'character-v4-030': '이미지 아래 HUCKLEBERRY FINN 정답 글자가 직접 노출됨',
  'character-v4-033': '일반 소녀 그림으로 보여 도로시 고유 특징을 식별하기 어려움',
  'character-v4-036': '어두운 동굴 장면으로 알리바바의 고유 특징을 식별하기 어려움',
  'character-v4-038': '평범한 중세 기마 인물처럼 보여 로빈 후드 식별이 어려움',
  'character-v4-039': '아서왕보다 여러 인물이 함께 있는 태피스트리가 중심임',
  'character-v4-040': '어두운 흑백 인물화로 멀린의 특징이 분명하지 않음',
  'character-v4-041': '산초 판사 단독 특징이 부족한 동상 사진임',
  'character-v4-042': '책 표지에 ROBINSON CRUSOE 정답 글자가 직접 노출됨',
  'character-v4-043': '투명 SVG의 검은 선이 게임 배경과 겹쳐 캐릭터가 보이지 않음',
  'character-v4-044': '검은 몸통이 게임 배경과 겹쳐 캐릭터 식별이 어려움',
  'character-v4-045': '포스터에 GERTIE 정답 글자가 직접 노출됨',
  'character-v4-046': '말풍선에 NEMO 정답 글자가 직접 노출됨',
  'character-v4-047': '기존 찰리 채플린 문제와 사실상 중복됨',
  'character-v4-048': '이미지 아래 HUCKLEBERRY FINN 정답 글자가 직접 노출됨',
  'character-v4-049': '배우 사진으로 지킬 박사와 하이드의 캐릭터 특징이 없음',
  'character-v4-050': '배우 이름이 크게 적힌 사진으로 도리언 그레이 식별이 어려움',
  'character-v4-051': '머리 없는 기사가 더 두드러져 이카보드 크레인 오답을 유발함'
};
const labels = { celebrity: '인물 · 연예인', history: '인물 · 역사', character: '인물 · 만화·동화 캐릭터', person: '인물', object: '사물' };
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
const candidates = payload.items.filter((item) => item.id.startsWith('character-v4-'));
const rejected = candidates.filter((item) => !approved.has(item.id));
payload.items = payload.items.filter((item) => !item.id.startsWith('character-v4-') || approved.has(item.id)).map((item) => approved.has(item.id) ? { ...item, reviewed: true, gameGroup: 'character' } : item);
const usedFiles = new Set(payload.items.map((item) => path.basename(item.image || '')));
for (const file of await readdir(IMAGE_DIR)) if (file.startsWith('character-v4-') && !usedFiles.has(file)) await unlink(path.join(IMAGE_DIR, file));
payload.reviewedAt = new Date().toISOString();
await writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`);

const rows = payload.items.map((item) => `<tr><td>${escapeHtml(item.answer)}</td><td>${labels[item.category] || item.category}</td><td>${escapeHtml(item.author)}</td><td>${escapeHtml(item.license)}</td><td><a href="${escapeHtml(item.sourceUrl)}" rel="noreferrer">원본 파일</a></td></tr>`).join('\n');
await writeFile(path.join(ROOT, 'dist', 'credits.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>사진 출처 | 삼삼오오</title><link rel="stylesheet" href="./style.css"></head><body><main class="credits-page"><a href="./">← 게임으로</a><h1>사진 출처</h1><p>문제 사진은 Wikimedia 프로젝트의 공개 라이선스 이미지를 내려받아 사용했습니다. 각 사진의 저작자와 라이선스는 아래 원본 파일 페이지에서 확인할 수 있습니다.</p><div class="credits-table-wrap"><table><thead><tr><th>정답</th><th>종류</th><th>저작자</th><th>라이선스</th><th>출처</th></tr></thead><tbody>${rows}</tbody></table></div></main></body></html>`);

const passed = payload.items.filter((item) => approved.has(item.id));
await writeFile(path.join(ROOT, 'docs', 'CHARACTER_V4_REVIEW.md'), `# 캐릭터 확장팩 v4 검수\n\nWikimedia 공개 라이선스 후보를 연락판과 원본 이미지로 육안 검수했다. 캐릭터 식별 가능 여부, 정답 직접 노출, 오답 유발 요소를 확인했다.\n\n## 출제 승인\n\n${passed.map((item) => `- ${item.id} · ${item.answer}: 식별 가능하며 정답 글자가 직접 노출되지 않음`).join('\n')}\n\n## 제외\n\n${rejected.map((item) => `- ${item.id} · ${item.answer}: ${rejectedReasons[item.id] || '식별이 어렵거나 정답이 노출됨'}`).join('\n')}\n`);
console.log(JSON.stringify({ approved: passed.length, rejected: rejected.length, total: payload.items.length }));
