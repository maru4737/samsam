import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_PATH = path.join(ROOT, 'dist', 'assets', 'questions.json');
const IMAGE_ROOT = path.join(ROOT, 'dist', 'assets', 'images');
const USER_AGENT = 'SamsamPartyGame/3.0 (personal project; Wikimedia attribution build)';

const lines = (text) => text.trim().split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
  const [answer, page = answer, aliases = ''] = line.split('|');
  return [answer.trim(), page.trim(), aliases.split(',').map((x) => x.trim()).filter(Boolean)];
});

const people = lines(`
송강호|송강호|
이정재|이정재|
하정우|하정우|
황정민|황정민 (배우)|
설경구|설경구|
조승우|조승우|
조진웅|조진웅|
이성민|이성민 (배우)|
박해일|박해일|
박희순|박희순|
김성균|김성균 (배우)|
김무열|김무열|
이제훈|이제훈|
이동욱|이동욱 (배우)|
지창욱|지창욱|
남궁민|남궁민 (배우)|
이준호|이준호 (연예인)|준호
임시완|임시완|
강하늘|강하늘|
김우빈|김우빈|
이종석|이종석 (배우)|
변우석|변우석|
김선호|김선호 (배우)|
류준열|류준열|
주지훈|주지훈|
김남길|김남길|
손석구|손석구|
구교환|구교환|
박정민|박정민 (배우)|
김동욱|김동욱 (배우)|
전도연|전도연|
김희애|김희애|
고현정|고현정|
엄정화|엄정화|
문소리|문소리|
김고은|김고은|
손예진|손예진|
송혜교|송혜교|
김태희|김태희|
공효진|공효진|
한지민|한지민|
신민아|신민아|
라미란|라미란|
염정아|염정아|
김선영|김선영 (1976년)|
전미도|전미도|
김지원|김지원 (배우)|
김혜윤|김혜윤|
박보영|박보영|
문근영|문근영|
한효주|한효주|
윤아|윤아|임윤아
혜리|혜리|이혜리
서현진|서현진 (배우)|
장나라|장나라|
이보영|이보영 (배우)|
정유미|정유미 (1983년)|
천우희|천우희|
전종서|전종서|
고민시|고민시|
김다미|김다미|
나문희|나문희|
윤여정|윤여정|
조용필|조용필|
나훈아|나훈아|
이미자|이미자|
이문세|이문세|
김완선|김완선|
박진영|박진영|
싸이|싸이|박재상
비|비 (연예인)|정지훈
태양|태양 (가수)|동영배
대성|대성 (가수)|강대성
태연|태연|김태연
윤하|윤하|고윤하
보아|보아|권보아
화사|화사|안혜진
선미|선미|이선미
청하|청하|김찬미
CL|CL (가수)|씨엘,이채린
지코|지코 (래퍼)|우지호
박재범|박재범|
크러쉬|크러쉬 (음악가)|신효섭
악동뮤지션|AKMU|악뮤,AKMU
이찬혁|이찬혁|
이수현|이수현 (가수)|
민니|민니|
미연|미연|
사나|사나 (가수)|미나토자키 사나
나연|나연|
모모|모모 (가수)|히라이 모모
쯔위|쯔위|저우쯔위
민지|민지 (2004년)|김민지
하니|하니 (2004년)|팜응옥헌
해린|해린|강해린
에릭 남|에릭 남|
헨리|헨리 라우|헨리 라우
이승기|이승기|
김종국|김종국|
하하|하하 (가수)|하동훈
양세형|양세형|
이수근|이수근|
김준호|김준호 (희극인)|
김숙|김숙|
송은이|송은이|
박나래|박나래|
장도연|장도연|
이은지|이은지 (희극인)|
조세호|조세호|
기안84|기안84|김희민
침착맨|이말년|이말년,이병건
봉준호|봉준호|
박찬욱|박찬욱|
홍상수|홍상수|
김지운|김지운 (영화 감독)|
류현진|류현진|
김하성|김하성|
이정후|이정후|
박세리|박세리|
박지성|박지성|
차범근|차범근|
김연경|김연경|
이상화|이상화 (스피드스케이팅 선수)|
박태환|박태환|
서장훈|서장훈|
허재|허재|
안세영|안세영|
신유빈|신유빈|
우상혁|우상혁|
오상욱|오상욱|
톰 행크스|톰 행크스|
로버트 다우니 주니어|로버트 다우니 주니어|로다주
키아누 리브스|키아누 리브스|
브래드 피트|브래드 피트|
조지 클루니|조지 클루니|
맷 데이먼|맷 데이먼|
윌 스미스|윌 스미스|
라이언 고슬링|라이언 고슬링|
라이언 레이놀즈|라이언 레이놀즈|
휴 잭맨|휴 잭맨|
크리스 헴스워스|크리스 헴스워스|
크리스 에반스|크리스 에반스|
베네딕트 컴버배치|베네딕트 컴버배치|
호아킨 피닉스|호아킨 피닉스|
제이크 질렌할|제이크 질런홀|제이크 질렌할
티모시 샬라메|티모테 샬라메|티모테 샬라메
젠데이아|젠데이아|
스칼렛 요한슨|스칼렛 요한슨|
앤 해서웨이|앤 해서웨이|
나탈리 포트만|나탈리 포트만|
엠마 스톤|엠마 스톤|
엠마 왓슨|엠마 왓슨|
마고 로비|마고 로비|
제니퍼 로렌스|제니퍼 로렌스|
메릴 스트립|메릴 스트립|
케이트 블란쳇|케이트 블란쳇|
줄리아 로버츠|줄리아 로버츠|
샤를리즈 테론|샤를리즈 테론|
니콜 키드먼|니콜 키드먼|
안젤리나 졸리|안젤리나 졸리|
레이디 가가|레이디 가가|
아델|아델 (가수)|
리한나|리한나|
브루노 마스|브루노 마스|
저스틴 비버|저스틴 비버|
에드 시런|에드 시런|
빌리 아일리시|빌리 아일리시|
아리아나 그란데|아리아나 그란데|
두아 리파|두아 리파|
셀레나 고메즈|셀레나 고메즈|
마이클 잭슨|마이클 잭슨|
엘비스 프레슬리|엘비스 프레슬리|
프레디 머큐리|프레디 머큐리|
데이비드 보위|데이비드 보위|
존 레논|존 레논|
폴 매카트니|폴 매카트니|
밥 딜런|밥 딜런|
마돈나|마돈나|
브리트니 스피어스|브리트니 스피어스|
셀린 디옹|셀린 디옹|
마이클 조던|마이클 조던|
르브론 제임스|르브론 제임스|
스테픈 커리|스테픈 커리|
코비 브라이언트|코비 브라이언트|
리오넬 메시|리오넬 메시|메시
크리스티아누 호날두|크리스티아누 호날두|호날두
킬리안 음바페|킬리안 음바페|음바페
네이마르|네이마르|
우사인 볼트|우사인 볼트|
마이클 펠프스|마이클 펠프스|
세리나 윌리엄스|세리나 윌리엄스|
로저 페더러|로저 페더러|
라파엘 나달|라파엘 나달|
노바크 조코비치|노바크 조코비치|
파블로 피카소|파블로 피카소|피카소
살바도르 달리|살바도르 달리|달리
클로드 모네|클로드 모네|모네
프리다 칼로|프리다 칼로|
앤디 워홀|앤디 워홀|
어니스트 헤밍웨이|어니스트 헤밍웨이|헤밍웨이
마크 트웨인|마크 트웨인|
찰스 디킨스|찰스 디킨스|디킨스
빅토르 위고|빅토르 위고|
레프 톨스토이|레프 톨스토이|톨스토이
표도르 도스토옙스키|표도르 도스토옙스키|도스토옙스키
버지니아 울프|버지니아 울프|
헬렌 켈러|헬렌 켈러|
마더 테레사|테레사 수녀|테레사 수녀
넬슨 만델라|넬슨 만델라|만델라
마틴 루터 킹 주니어|마틴 루터 킹 주니어|마틴 루터 킹
윈스턴 처칠|윈스턴 처칠|처칠
프랭클린 D. 루스벨트|프랭클린 D. 루스벨트|루스벨트
존 F. 케네디|존 F. 케네디|케네디
체 게바라|체 게바라|게바라
스티브 잡스|스티브 잡스|
빌 게이츠|빌 게이츠|
일론 머스크|일론 머스크|
마크 저커버그|마크 저커버그|
제프 베이조스|제프 베이조스|
팀 쿡|팀 쿡|
`);

const objects = lines(`
숟가락|숟가락|
젓가락|젓가락|
포크|포크 (식기)|
나이프|나이프|
접시|접시|
그릇|그릇|
컵|컵|
머그잔|머그잔|머그컵
유리잔|유리잔|
와인잔|와인잔|
냄비|냄비|
압력솥|압력솥|
밥솥|전기밥솥|전기밥솥
가스레인지|가스레인지|
인덕션|유도가열|
오븐|오븐|
에어 프라이어|에어 프라이어|에어프라이어
믹서기|블렌더|블렌더
커피메이커|커피메이커|
커피포트|전기 주전자|전기주전자
식기세척기|식기세척기|
싱크대|싱크대|
도마|도마|
식칼|부엌칼|부엌칼
감자칼|감자칼|필러
뒤집개|뒤집개|
주걱|주걱|
밀대|밀대 (도구)|
계량컵|계량컵|
계량스푼|계량스푼|
보온병|보온병|텀블러
도시락|도시락|
쟁반|쟁반|
프렌치 프레스|프렌치 프레스|
캔따개|캔따개|
코르크스크루|코르크스크루|와인 오프너
집게|집게|
행주|행주|
수세미|수세미|
고무장갑|고무장갑|
소파|소파|
의자|의자|
책상|책상|
식탁|식탁|
침대|침대|
매트리스|매트리스|
베개|베개|
이불|이불|
옷장|옷장|
서랍장|서랍장|
책장|책장 (가구)|
신발장|신발장|
화장대|화장대|
거울|거울|
액자|액자|
커튼|커튼|
블라인드|블라인드|
카펫|카펫|
스탠드 조명|스탠드 (조명)|스탠드
샹들리에|샹들리에|
촛대|촛대|
옷걸이|옷걸이|
빨래건조대|빨래건조대|건조대
다림질판|다림질판|
휴지통|쓰레기통|쓰레기통
빗자루|빗자루|
쓰레받기|쓰레받기|
대걸레|대걸레|밀대걸레
양동이|양동이|버킷
분무기|분무기|
빨래집게|빨래집게|
세탁기|세탁기|
건조기|의류건조기|의류건조기
공기청정기|공기청정기|
가습기|가습기|
제습기|제습기|
에어컨|에어컨|냉방기
보일러|보일러|
온도계|온도계|
체중계|체중계|
알람시계|알람시계|
벽시계|벽시계|
손목시계|손목시계|
칫솔|칫솔|
치실|치실|
면도기|면도기|
전기면도기|전기면도기|
빗|빗|
헤어브러시|헤어브러시|
샴푸|샴푸|
비누|비누|
수건|수건|
목욕가운|목욕 가운|목욕 가운
슬리퍼|슬리퍼|
샤워기|샤워기|
욕조|욕조|
변기|변기|
세면대|세면대|
휴지|화장지|화장지
이어폰|이어폰|
헤드폰|헤드폰|
스피커|스피커|
마이크|마이크|
스마트폰|스마트폰|휴대폰
태블릿 컴퓨터|태블릿 컴퓨터|태블릿
노트북|노트북 컴퓨터|노트북
모니터|컴퓨터 모니터|컴퓨터 모니터
프린터|프린터|
스캐너|이미지 스캐너|스캐너
웹캠|웹캠|
USB 메모리|USB 플래시 드라이브|USB,유에스비
외장 하드|외장 하드 디스크|외장하드
메모리 카드|메모리 카드|SD 카드
공유기|라우터|라우터,와이파이 공유기
모뎀|모뎀|
충전기|충전기|
보조 배터리|보조 배터리|
멀티탭|멀티탭|
콘센트|콘센트|
플러그|플러그|
전선|전선|
배터리|전지|전지,건전지
손풍기|휴대용 선풍기|휴대용 선풍기
빔프로젝터|비디오 프로젝터|프로젝터
텔레비전|텔레비전|TV,티비
라디오|라디오|
턴테이블|턴테이블|레코드 플레이어
게임패드|게임패드|게임 컨트롤러
조이스틱|조이스틱|
드론|무인 항공기|무인 항공기
액션캠|액션캠|
삼각대|삼각대|
셀카봉|셀카봉|
확성기|메가폰|메가폰
프로젝션 스크린|영사막|영사막
연필|연필|
샤프펜슬|샤프펜슬|샤프
볼펜|볼펜|
만년필|만년필|
형광펜|형광펜|
지우개|지우개|
연필깎이|연필깎이|
자|자 (도구)|
삼각자|삼각자|
컴퍼스|컴퍼스 (제도)|제도용 컴퍼스
노트|공책|공책
스케치북|스케치북|
포스트잇|포스트잇|접착식 메모지
클립|종이 클립|종이 클립
압정|압정|
펀치|천공기|천공기
테이프|접착 테이프|접착테이프
테이프 커터|테이프 디스펜서|테이프 디스펜서
풀|접착제|접착제
가위|가위|
커터칼|커터칼|
필통|필통|
파일철|파일 (문구)|파일
화이트보드|화이트보드|
칠판|칠판|
분필|분필|
계산기|계산기|
도장|도장 (인장)|인장
잉크패드|스탬프 패드|스탬프 패드
봉투|봉투|
우표|우표|
편지지|편지지|
책갈피|책갈피|
망치|망치|
고무망치|고무망치|
도끼|도끼|
톱|톱 (도구)|
전기톱|전기톱|체인톱
드릴|전동 드릴|전동 드릴
전동 드라이버|전동 드라이버|
몽키스패너|몽키스패너|
렌치|렌치|스패너
육각 렌치|육각렌치|육각렌치,앨런 키
펜치|펜치|플라이어
니퍼|니퍼|
바이스|바이스|
클램프|클램프|
대패|대패 (도구)|
끌|끌 (도구)|
송곳|송곳|
사포|사포|
줄|줄 (공구)|쇠줄
수평계|수평계|
줄자|줄자|
공구함|공구함|
사다리|사다리|
손수레|손수레|
삽|삽|
곡괭이|곡괭이|
갈퀴|갈퀴|
호미|호미|
낫|낫|
전지가위|전정가위|전정가위
물뿌리개|물뿌리개|
정원 호스|호스|호스
화분|화분|
손전등|손전등|
랜턴|랜턴|
나침반|나침반|
쌍안경|쌍안경|
망원경|망원경|
돋보기|돋보기|확대경
현미경|현미경|
시험관|시험관|
비커|비커|
플라스크|플라스크|
페트리 접시|페트리 접시|
스포이트|스포이트|스포이드
주사기|주사기|
청진기|청진기|
혈압계|혈압계|
붕대|붕대|
목발|목발|
휠체어|휠체어|
구급상자|구급상자|
마스크|마스크|
안경|안경|
선글라스|선글라스|
콘택트렌즈|콘택트 렌즈|콘택트 렌즈
우산|우산|
양산|양산|
가방|가방|
백팩|배낭|배낭
여행가방|여행 가방|캐리어
지갑|지갑|
동전지갑|동전 지갑|동전 지갑
벨트|허리띠|허리띠
모자|모자|
야구모자|야구 모자|야구 모자
목도리|목도리|
장갑|장갑|
양말|양말|
운동화|운동화|
구두|구두|
샌들|샌들|
장화|장화|
넥타이|넥타이|
나비넥타이|나비 넥타이|나비 넥타이
단추|단추|
지퍼|지퍼|
바늘|바늘|
실|실|
재봉틀|재봉틀|
다리미|다리미|
자전거|자전거|
킥보드|킥보드|
스케이트보드|스케이트보드|
롤러스케이트|롤러스케이트|
오토바이|모터사이클|모터사이클
자동차|자동차|
버스|버스|
택시|택시|
트럭|트럭|
구급차|구급차|
소방차|소방차|
경찰차|경찰차|
기차|열차|열차
지하철|도시 철도|도시철도
트램|노면전차|노면전차
비행기|비행기|
헬리콥터|헬리콥터|
열기구|열기구|
로켓|로켓|
배|선박|선박
요트|요트|
카누|카누|
카약|카약|
서핑보드|서프보드|서프보드
구명조끼|구명조끼|
교통콘|교통콘|라바콘
신호등|신호등|
표지판|교통 표지|교통 표지
소화전|소화전|
농구공|농구공|
축구공|축구공|
야구공|야구공|
배구공|배구공|
테니스공|테니스공|
볼링공|볼링공|
골프공|골프공|
탁구공|탁구공|
배드민턴 셔틀콕|셔틀콕|셔틀콕
야구방망이|야구 방망이|야구 배트
테니스 라켓|테니스 라켓|
배드민턴 라켓|배드민턴 라켓|
탁구채|탁구 라켓|탁구 라켓
골프채|골프 클럽|골프 클럽
하키 스틱|하키 스틱|
권투 글러브|권투 글러브|복싱 글러브
줄넘기|줄넘기|
훌라후프|훌라후프|
요가 매트|요가 매트|
아령|덤벨|덤벨
바벨|바벨|
러닝머신|트레드밀|트레드밀
호루라기|호루라기|
메달|메달|
트로피|트로피|
기타|기타|
일렉트릭 기타|일렉트릭 기타|전기 기타
베이스 기타|베이스 기타|
바이올린|바이올린|
첼로|첼로|
콘트라베이스|콘트라베이스|
피아노|피아노|
키보드 악기|전자 키보드|전자 키보드
드럼|드럼 세트|드럼 세트
트럼펫|트럼펫|
트롬본|트롬본|
색소폰|색소폰|
플루트|플루트|
클라리넷|클라리넷|
하모니카|하모니카|
아코디언|아코디언|
우쿨렐레|우쿨렐레|
하프|하프|
실로폰|실로폰|
탬버린|탬버린|
캐스터네츠|캐스터네츠|
심벌즈|심벌즈|
리코더|리코더|
메트로놈|메트로놈|
악보대|악보대|
`);

const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
const titleKey = (value) => String(value).replace(/^.*?:/, '').replaceAll('_', ' ').toLowerCase();
const extensionFor = (mime) => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[mime] || 'jpg');

async function api(params) {
  const body = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch('https://ko.wikipedia.org/w/api.php', { method: 'POST', headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded' }, body });
    if (response.ok) return response.json();
    if (response.status !== 429) throw new Error(`${response.status} MediaWiki API`);
    await new Promise((resolve) => setTimeout(resolve, 1800 * (attempt + 1)));
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

async function metadata(entries) {
  const output = [];
  for (let offset = 0; offset < entries.length; offset += 40) {
    const batch = entries.slice(offset, offset + 40);
    const data = await api({ prop: 'pageimages', piprop: 'name|thumbnail|original', pithumbsize: '800', redirects: '1', titles: batch.map((x) => x[1]).join('|') });
    const query = data.query || {};
    const pages = new Map((query.pages || []).map((page) => [page.title, page]));
    const mapped = batch.map((entry, index) => ({ entry, index: offset + index, page: pages.get(resolvedTitle(entry[1], query)) }));
    const titles = mapped.filter((x) => x.page?.pageimage).map((x) => x.page.pageimage.startsWith('파일:') ? x.page.pageimage : `파일:${x.page.pageimage}`);
    let imagePages = new Map();
    if (titles.length) {
      const imageData = await api({ prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '800', titles: titles.join('|') });
      imagePages = new Map((imageData.query?.pages || []).map((page) => [titleKey(page.title), page]));
    }
    for (const item of mapped) {
      if (!item.page?.pageimage) { output.push({ ...item, error: '대표 이미지 없음' }); continue; }
      const fileTitle = item.page.pageimage.startsWith('파일:') ? item.page.pageimage : `파일:${item.page.pageimage}`;
      const info = imagePages.get(titleKey(fileTitle))?.imageinfo?.[0];
      if (!info?.thumburl && !info?.url) { output.push({ ...item, error: '파일 정보 없음' }); continue; }
      const meta = info.extmetadata || {};
      const license = stripHtml(meta.LicenseShortName?.value || meta.License?.value || 'Unknown');
      if (!/CC|Creative Commons|Public domain|퍼블릭 도메인|GFDL/i.test(license)) { output.push({ ...item, error: `라이선스 ${license}` }); continue; }
      output.push({ ...item, imageInfo: { fileTitle, downloadUrl: info.thumburl || info.url, sourceUrl: info.descriptionurl, author: stripHtml(meta.Artist?.value || meta.Credit?.value || 'Wikimedia contributor'), license, licenseUrl: meta.LicenseUrl?.value || '', mime: info.thumbmime || info.mime || 'image/jpeg', width: info.thumbwidth || info.width, height: info.thumbheight || info.height } });
    }
    console.log(`메타데이터 ${Math.min(offset + batch.length, entries.length)}/${entries.length}`);
  }
  return output;
}

async function download(category, entries, existingAnswers) {
  const directory = path.join(IMAGE_ROOT, category);
  await mkdir(directory, { recursive: true });
  for (const name of await readdir(directory)) if (name.startsWith(`${category}-v3-`)) await unlink(path.join(directory, name));
  const filtered = entries.filter(([answer]) => !existingAnswers.has(answer));
  const found = await metadata(filtered);
  const results = [];
  const failures = [];
  for (const item of found) {
    const [answer, page, accepted] = item.entry;
    if (item.error) { failures.push({ category, answer, page, error: item.error, expansionV3: true }); continue; }
    if ((item.imageInfo.width || 0) < 280 || (item.imageInfo.height || 0) < 280) { failures.push({ category, answer, page, error: '썸네일 해상도 부족', expansionV3: true }); continue; }
    const id = `${category}-v3-${String(item.index + 1).padStart(3, '0')}`;
    const ext = extensionFor(item.imageInfo.mime);
    const filename = `${id}.${ext}`;
    let response;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetch(item.imageInfo.downloadUrl, { headers: { 'user-agent': USER_AGENT } });
      if (response.ok) break;
      await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
    }
    if (!response?.ok) { failures.push({ category, answer, page, error: `다운로드 ${response?.status}`, expansionV3: true }); continue; }
    await writeFile(path.join(directory, filename), Buffer.from(await response.arrayBuffer()));
    results.push({ id, category, difficulty: 'hard', answer, accepted, image: `./assets/images/${category}/${filename}`, page, ...item.imageInfo, reviewed: false });
    if (results.length % 20 === 0) console.log(`${category} 다운로드 ${results.length}`);
  }
  return { results, failures };
}

const payload = JSON.parse(await readFile(DATA_PATH, 'utf8'));
payload.items = payload.items.filter((item) => !item.id.includes('-v3-'));
payload.failures = (payload.failures || []).filter((item) => !item.expansionV3);
const existingAnswers = new Set(payload.items.map((item) => item.answer));
const personPack = await download('person', people, existingAnswers);
for (const item of personPack.results) existingAnswers.add(item.answer);
const objectPack = await download('object', objects, existingAnswers);
payload.items.push(...personPack.results, ...objectPack.results);
payload.failures.push(...personPack.failures, ...objectPack.failures);
payload.generatedAt = new Date().toISOString();
await writeFile(DATA_PATH, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ personAdded: personPack.results.length, objectAdded: objectPack.results.length, total: payload.items.length, failures: personPack.failures.length + objectPack.failures.length }));
