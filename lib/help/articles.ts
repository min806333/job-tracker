export type HelpCategory =
  | "getting-started"
  | "features"
  | "calendar-report"
  | "account-data"
  | "troubleshooting"
  | "supporter";

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  category: HelpCategory;
  tags: string[];
  updatedAt: string; // YYYY-MM-DD
  body: string; // markdown-ish (simple)
  featured?: boolean;
};

export const CATEGORY_LABEL: Record<HelpCategory, string> = {
  "getting-started": "시작하기",
  features: "기능 사용법",
  "calendar-report": "캘린더 · 리포트",
  "account-data": "계정 · 데이터",
  troubleshooting: "문제 해결",
  supporter: "Supporter · 플랜",
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "add-application",
    title: "지원서(카드) 추가하는 법",
    summary: "회사/포지션/마감/팔로업을 입력해서 캘린더와 Today에 자동으로 뜨게 만들어요.",
    category: "getting-started",
    tags: ["지원서", "추가", "마감", "팔로업"],
    updatedAt: "2026-02-22",
    featured: true,
    body: `
## 이렇게 하면 돼요
1. **➕ 지원서 추가** 버튼을 눌러요.
2. 회사명 / 포지션을 입력해요.
3. **마감일(deadline)** 또는 **팔로업(followup)** 을 넣으면 캘린더/Today에 자동 표시돼요.
4. 저장하면 카드가 생성돼요.

## 팁
- 마감이 없으면 팔로업 날짜만 넣어도 Today에 잡혀요.
- 링크(채용 공고)를 넣어두면 나중에 찾기 편해요.
`,
  },
  {
    slug: "today-works",
    title: "Today 화면은 어떤 기준으로 정렬되나요?",
    summary: "오늘 해야 할 것(마감/팔로업/다음 행동)을 실행 우선순위로 보여줘요.",
    category: "features",
    tags: ["Today", "우선순위", "실행"],
    updatedAt: "2026-02-22",
    featured: true,
    body: `
## 정렬 기준(개념)
- **마감 임박** → 가장 위
- **팔로업 예정** → 그 다음
- **다음 행동** 이 있는 항목 → 실행 큐에 올라와요

## 실전 사용법
- Today에서 “지금 당장 할 1개”만 먼저 처리해도 하루가 달라져요.
`,
  },
  {
    slug: "focus-top3",
    title: "Focus Top3(핀)은 어떻게 쓰면 좋나요?",
    summary: "이번 주 최우선 지원 3개를 고정해서 항상 상단에 보이게 해요.",
    category: "features",
    tags: ["Focus", "핀", "Top3"],
    updatedAt: "2026-02-22",
    featured: true,
    body: `
## 추천 규칙
- **이번 주에 진짜 중요한 3개만** 핀 하세요.
- 핀은 “할 일 목록”이 아니라 “우선순위 선언”이에요.

## 핀/해제
- 카드의 📌 버튼을 눌러 핀/해제할 수 있어요.
`,
  },
  {
    slug: "batch-actions",
    title: "여러 개를 한 번에 처리(Batch)하려면?",
    summary: "List에서 멀티 선택 후 단계 변경/완료/아카이브 등을 한 번에 처리할 수 있어요.",
    category: "features",
    tags: ["Batch", "멀티선택", "List"],
    updatedAt: "2026-02-22",
    body: `
## 방법
1. **List 탭**으로 이동
2. 여러 항목을 선택(체크/멀티 선택)
3. 상단/하단 배치 액션으로 한 번에 처리

## 팁
- 일주일에 한 번, “정리 시간”을 잡고 Batch 처리하면 전체가 깔끔해져요.
`,
  },
  {
    slug: "calendar-shows",
    title: "캘린더에는 무엇이 표시되나요?",
    summary: "마감(deadline)과 팔로업(followup)이 있는 지원서가 캘린더에 표시돼요.",
    category: "calendar-report",
    tags: ["Calendar", "마감", "팔로업"],
    updatedAt: "2026-02-22",
    body: `
## 표시 규칙
- **deadline**: 마감일로 표시
- **followup**: 팔로업 일정으로 표시

## 비어있다면?
- 지원서에 deadline/followup 날짜를 하나라도 넣어주세요.
`,
  },
  {
    slug: "report-basics",
    title: "리포트는 어떤 걸 보여주나요?",
    summary: "현재 파이프라인(단계별 분포)과 진행 흐름을 한눈에 보여줘요.",
    category: "calendar-report",
    tags: ["Report", "통계"],
    updatedAt: "2026-02-22",
    body: `
## 리포트에서 확인할 수 있는 것
- 단계별 지원서 수
- 최근 진행 로그(변경/완료 등)

## 팁
- 리포트는 “잘하고 있다/못하고 있다”가 아니라 “어디가 막히는지”를 보여줘요.
`,
  },
  {
    slug: "data-safety",
    title: "내 데이터는 어디에 저장되나요?",
    summary: "로그인된 계정 기준으로 분리되어 저장되고, 다른 사용자는 볼 수 없어요(RLS).",
    category: "account-data",
    tags: ["데이터", "보안", "RLS"],
    updatedAt: "2026-02-22",
    body: `
## 저장 방식
- Supabase(Postgres)에 저장돼요.
- 계정(userId) 기준으로 분리되고 RLS로 보호돼요.

## 주의
- 공유 기능을 만들기 전까지는 기본적으로 “나만 보는 구조”예요.
`,
  },
  {
    slug: "limits-free-supporter",
    title: "Free vs Supporter(후원) 차이는 뭔가요?",
    summary: "기능 강요 없이, Supporter는 운영비 후원 + 배지 + 일부 제한 완화가 핵심이에요.",
    category: "supporter",
    tags: ["Free", "Supporter", "플랜"],
    updatedAt: "2026-02-22",
    featured: true,
    body: `
## Free
- 기본 기능 대부분 사용 가능
- 일부 한도/옵션 제한이 있을 수 있어요

## Supporter(후원)
- 배지 표시
- 운영비 후원
- 일부 제한 완화(향후 정책에 따라 조정)

## 결제는?
- 현재는 Stripe 연동 전이라 문의 기반으로 운영 가능해요.
`,
  },
  {
    slug: "theme-gray-screen",
    title: "화면이 회색/이상하게 보일 때",
    summary: "bg-white, globals.css, 레이어 충돌로 생길 수 있어요. 다크 zinc 기준으로 정리하세요.",
    category: "troubleshooting",
    tags: ["테마", "회색", "zinc"],
    updatedAt: "2026-02-22",
    body: `
## 체크리스트
- bg-white가 남아있는지 확인
- globals.css에서 body 배경이 덮어쓰는지 확인
- 카드/섹션 레이어(bg-zinc-900/800)가 일관적인지 확인

## 해결 팁
- L0(bg-zinc-950) → L1(bg-zinc-900) → L2(bg-zinc-800) 구조로 통일하세요.
`,
  },
  {
    slug: "contact-support",
    title: "그래도 해결이 안 되면 문의하기",
    summary: "문의 내용을 자동으로 채워서 고객센터로 보낼 수 있어요.",
    category: "troubleshooting",
    tags: ["문의", "고객센터"],
    updatedAt: "2026-02-22",
    body: `
## 문의하기
- 고객센터에서 문의를 남기면 확인 후 답변드려요.
- 가능한 한 **어떤 화면에서, 무엇을 하다가** 문제가 생겼는지 적어주세요.
`,
  },
];

export function getArticles() {
  return HELP_ARTICLES;
}

export function getArticleBySlug(slug: string) {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}
