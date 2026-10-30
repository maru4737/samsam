import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const rejected = new Map([
  ['object-v3-006', '그릇보다 장식용 박이 중심이라 형태가 낯설어 제외'],
  ['object-v3-017', '에어프라이어 전체가 아닌 열선만 보여 제외'],
  ['object-v3-043', '책상보다 장식장에 가까워 제외'],
  ['object-v3-073', '건조기로 식별하기 어려운 구형 장비라 제외'],
  ['object-v3-077', '에어컨보다 인물이 중심인 오래된 자료 사진이라 제외'],
  ['object-v3-078', '보일러로 식별하기 어려운 산업용 구형 장비라 제외'],
  ['object-v3-089', '샴푸로 식별하기 어려운 골동품 병이라 제외'],
  ['object-v3-094', '샤워기보다 사람이 중심이라 제외'],
  ['object-v3-099', '이어폰이 아니라 헤드폰이며 다음 항목과 중복이라 제외'],
  ['object-v3-111', '외장 하드가 아닌 분해된 내장 하드라 제외'],
  ['object-v3-113', '공유기보다 통신 장비실 전체가 중심이라 제외'],
  ['object-v3-114', '모뎀 실물이 아닌 회로 기판 도해라 제외'],
  ['object-v3-128', '조이스틱 실물이 아닌 조작부 도해라 제외'],
  ['object-v3-143', '삼각자 실물이 아닌 기호형 그림이라 제외'],
  ['object-v3-147', '포스트잇 실물이 아닌 상표 로고라 제외'],
  ['object-v3-163', '우표보다 번호 표기가 중심인 설명용 도해라 제외'],
  ['object-v3-170', '검은 배경에 작은 아이콘만 보여 제외'],
  ['object-v3-176', '클램프 도구가 아닌 동명 만화가 집단 사진이라 제외'],
  ['object-v3-184', '사다리가 작고 흐릿한 흑백 자료라 제외'],
  ['object-v3-196', '쌍안경 실물이 아닌 설명용 그림이라 제외'],
  ['object-v3-205', '붕대가 아닌 고대 도자기 그림이라 제외'],
  ['object-v3-213', '양산 실물이 아닌 검은 도해라 제외'],
  ['object-v3-218', '동전지갑으로 식별하기 어려운 직물이라 제외'],
  ['object-v3-220', '모자 실물이 아닌 여러 형태의 설명용 판화라 제외'],
  ['object-v3-235', '재봉틀에 번호 표기가 겹친 설명용 사진이라 제외'],
  ['object-v3-237', '킥보드가 어둡고 작게 보여 제외'],
  ['object-v3-252', '헬리콥터가 작고 흐릿한 흑백 자료라 제외'],
  ['object-v3-254', '로켓으로 식별하기 어려운 실험 장비 사진이라 제외'],
  ['object-v3-272', '탁구공보다 경기 장면 전체가 중심이라 제외'],
  ['object-v3-277', '탁구채보다 경기 장면 전체가 중심이며 중복이라 제외'],
  ['object-v3-282', '훌라후프가 거의 보이지 않는 거리 사진이라 제외'],
  ['object-v3-291', '일렉트릭 기타 실물이 아닌 어두운 기호라 제외'],
  ['object-v3-299', '트럼펫이 보이지 않는 검은 이미지라 제외'],
  ['object-v3-301', '색소폰이 아닌 붉은 선만 보여 제외'],
  ['object-v3-303', '클라리넷이 보이지 않는 검은 이미지라 제외'],
  ['object-v3-311', '일반 심벌즈가 아닌 작은 핑거 심벌즈라 제외']
]);
const categoryLabels = { celebrity: '인물 · 연예인', history: '인물 · 역사', character: '인물 · 만화·동화 캐릭터', person: '인물', object: '사물' };
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
const removed = payload.items.filter((item) => rejected.has(item.id));
const aliases = new Map([
  ['머그잔', ['머그컵']], ['가스레인지', ['가스렌지']], ['믹서기', ['블렌더']],
  ['스마트폰', ['휴대폰', '핸드폰']], ['태블릿 컴퓨터', ['태블릿', '태블릿PC']],
  ['빔프로젝터', ['프로젝터']], ['게임패드', ['게임 컨트롤러', '컨트롤러']],
  ['액션캠', ['액션 카메라']], ['셀카봉', ['셀피 스틱']], ['확성기', ['메가폰']],
  ['멀티탭', ['전원 멀티탭']], ['몽키스패너', ['조절 렌치']], ['육각 렌치', ['앨런 키']],
  ['구급상자', ['구급함']], ['선글라스', ['썬글라스']], ['콘택트렌즈', ['렌즈']],
  ['킬리안 음바페', ['음바페']], ['크리스티아누 호날두', ['호날두']],
  ['로버트 다우니 주니어', ['로다주']], ['마이클 조던', ['조던']], ['르브론 제임스', ['르브론']]
]);
payload.items = payload.items.filter((item) => !rejected.has(item.id)).map((item) => ({
  ...item,
  accepted: [...new Set([...(item.accepted || []), ...(aliases.get(item.answer) || [])])],
  reviewed: true
}));
payload.reviewedAt = new Date().toISOString();
payload.review = { method: '전체 썸네일 시트 시각 검수', approved: payload.items.length, rejected: removed.map((item) => ({ id: item.id, answer: item.answer, reason: rejected.get(item.id) })) };
await writeFile(DATA_PATH, JSON.stringify(payload, null, 2));

for (const category of [...new Set(payload.items.map((item) => item.category))]) {
  const directory = path.join(ROOT, 'dist', 'assets', 'images', category);
  for (const name of await readdir(directory)) {
    const item = payload.items.find((entry) => entry.category === category && path.basename(entry.image) === name);
    if (!item) await unlink(path.join(directory, name));
  }
}

const rows = payload.items.map((item) => `<tr><td>${escapeHtml(item.answer)}</td><td>${categoryLabels[item.category] || item.category}</td><td>${escapeHtml(item.author)}</td><td>${escapeHtml(item.license)}</td><td><a href="${escapeHtml(item.sourceUrl)}" rel="noreferrer">원본 파일</a></td></tr>`).join('\n');
await writeFile(path.join(ROOT, 'dist', 'credits.html'), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>사진 출처 | 삼삼오오</title><link rel="stylesheet" href="./style.css"></head><body><main class="credits-page"><a href="./">← 게임으로</a><h1>사진 출처</h1><p>문제 사진은 Wikimedia 프로젝트의 공개 라이선스 이미지를 내려받아 사용했습니다. 각 사진의 저작자와 라이선스는 아래 원본 파일 페이지에서 확인할 수 있습니다.</p><div class="credits-table-wrap"><table><thead><tr><th>정답</th><th>종류</th><th>저작자</th><th>라이선스</th><th>출처</th></tr></thead><tbody>${rows}</tbody></table></div></main></body></html>`);

const reviewRows = payload.items.map((item) => `| ${item.id} | ${categoryLabels[item.category] || item.category} | ${item.answer} | 통과 | 인물·캐릭터·사물이 식별 가능하고 정답을 직접 노출하지 않음 |`).join('\n');
const rejectRows = [...rejected].map(([id, reason]) => `| ${id} | ${removed.find((item) => item.id === id)?.answer || '-'} | 제외 | ${reason} |`).join('\n');
await writeFile(path.join(ROOT, 'docs', 'IMAGE_REVIEW.md'), `# 문제 사진 검수 기록\n\n검수 방식: 모든 로컬 사진을 카테고리별 전체 썸네일 시트로 만들어 육안 확인. 인물·사물 식별 가능 여부, 정답을 직접 노출하는 글자, 심한 저해상도·왜곡, 오답 유발 가능성을 확인했다.\n\n## 출제 승인\n\n| ID | 종류 | 정답 | 결과 | 근거 |\n| --- | --- | --- | --- | --- |\n${reviewRows}\n\n## 제외\n\n| ID | 정답 | 결과 | 이유 |\n| --- | --- | --- | --- |\n${rejectRows}\n`);

console.log(`최종 승인 ${payload.items.length}장, 제외 ${removed.length}장`);
