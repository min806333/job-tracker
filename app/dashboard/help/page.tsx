import Link from "next/link";
import { CATEGORY_LABEL, getArticles, type HelpCategory } from "@/lib/help/articles";
import { sanitizeTextForQueryParam } from "@/lib/text/sanitize";

const CONTACT_SUBJECT = "문의하기";
const CONTACT_MESSAGE = "어떤 도움이 필요하신가요? (가능하면 화면/상황을 함께 적어주세요)";

function categoryIcon(category: HelpCategory) {
  const iconMap: Record<HelpCategory, string> = {
    "getting-started": "🚀",
    features: "🧩",
    "calendar-report": "📅",
    "account-data": "👤",
    troubleshooting: "🛠️",
    supporter: "💚",
  };
  return iconMap[category];
}

export default async function HelpPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const articles = getArticles() ?? [];

  const categories = Object.keys(CATEGORY_LABEL) as HelpCategory[];
  const catRaw = (resolvedSearchParams?.cat ?? "").trim();
  const category: HelpCategory | undefined = categories.includes(catRaw as HelpCategory)
    ? (catRaw as HelpCategory)
    : undefined;
  const currentCategoryLabel = category ? CATEGORY_LABEL[category] : "전체";
  const q = (resolvedSearchParams?.q ?? "").trim().toLowerCase();

  const filtered = articles.filter((article) => {
    const byCategory = category ? article.category === category : true;
    const byQuery = q
      ? `${article.title} ${article.summary} ${article.tags.join(" ")}`.toLowerCase().includes(q)
      : true;
    return byCategory && byQuery;
  });

  const featured = articles.filter((article) => article.featured).slice(0, 7);
  const counts = articles.reduce((acc, article) => {
    acc[article.category] = (acc[article.category] ?? 0) + 1;
    return acc;
  }, {} as Record<HelpCategory, number>);

  const contactHref = `/dashboard/support?subject=${encodeURIComponent(
    sanitizeTextForQueryParam(CONTACT_SUBJECT)
  )}&message=${encodeURIComponent(sanitizeTextForQueryParam(CONTACT_MESSAGE))}`;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-lg font-semibold text-zinc-100">도움말</h1>
        <p className="mt-1 text-sm text-zinc-400">
          자주 묻는 질문을 먼저 확인하고, 해결되지 않으면 문의하기로 이어가세요.
        </p>

        <form className="mt-4">
          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={resolvedSearchParams?.q ?? ""}
              placeholder="검색어 입력 (예: 캘린더, 보고서, 계정)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {category ? <input type="hidden" name="cat" value={category} /> : null}

            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              검색
            </button>
          </div>

          {(category || q) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <span>
                필터: {currentCategoryLabel}
                {q ? ` · "${q}"` : ""}
              </span>
              <Link href="/dashboard/help" className="text-emerald-300 hover:text-emerald-200">
                필터 초기화
              </Link>
            </div>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">자주 묻는 질문</h2>
          <span className="text-xs text-zinc-500">{featured.length}개</span>
        </div>

        <div className="mt-4 space-y-2">
          {featured.map((article) => (
            <details key={article.slug} className="group rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div className="min-w-0 truncate text-sm font-medium text-zinc-100">{article.title}</div>
                <span className="text-zinc-500 transition group-open:rotate-180">⌄</span>
              </summary>

              <div className="mt-3 text-sm text-zinc-400">
                {article.summary}
                <div className="mt-3">
                  <Link
                    href={`/dashboard/support/${article.slug}`}
                    className="inline-flex items-center text-sm text-emerald-300 hover:text-emerald-200"
                  >
                    자세히 보기 →
                  </Link>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">FAQ</h2>
          {category ? (
            <Link href="/dashboard/help" className="text-xs text-emerald-300 hover:text-emerald-200">
              전체 보기
            </Link>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((item) => (
            <Link
              key={item}
              href={`/dashboard/help?cat=${item}`}
              className={[
                "group rounded-2xl border p-4 transition",
                category === item
                  ? "border-emerald-900/40 bg-emerald-950/20"
                  : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "grid h-9 w-9 place-items-center rounded-xl border",
                    category === item
                      ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
                      : "border-zinc-700 bg-zinc-800 text-zinc-200",
                  ].join(" ")}
                >
                  <span aria-hidden>{categoryIcon(item)}</span>
                </div>

                <div className="min-w-0">
                  <div className={["text-sm font-medium", category === item ? "text-emerald-200" : "text-zinc-100"].join(" ")}>
                    {CATEGORY_LABEL[item]}
                  </div>
                  <div className="text-xs text-zinc-500">{counts[item] ?? 0}개 문서</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4">
          <Link
            href={contactHref}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:bg-zinc-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            문의하기
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-200">{currentCategoryLabel}</h2>
          <span className="text-xs text-zinc-500">{filtered.length}개</span>
        </div>

        <div className="mt-4 grid gap-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-400">
              조건에 맞는 도움말이 없습니다.
            </div>
          ) : (
            filtered.map((article) => (
              <Link
                key={article.slug}
                href={`/dashboard/support/${article.slug}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 transition hover:bg-zinc-950/60"
              >
                <div className="text-sm font-medium text-zinc-100">{article.title}</div>
                <div className="mt-1 text-sm text-zinc-400">{article.summary}</div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
