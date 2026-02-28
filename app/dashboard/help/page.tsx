import Link from "next/link";
import {
  getArticles,
  CATEGORY_LABEL,
  type HelpCategory,
} from "@/lib/help/articles";

function Icon({ cat }: { cat: HelpCategory }) {
  const map: Record<HelpCategory, string> = {
    "getting-started": "🚀",
    features: "🧩",
    "calendar-report": "🗓️",
    "account-data": "👤",
    troubleshooting: "🛠️",
    supporter: "💚",
  };
  return <span aria-hidden>{map[cat] ?? "📄"}</span>;
}

function CategoryButton({
  cat,
  count,
  active,
}: {
  cat: HelpCategory;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={`/dashboard/support?cat=${cat}`}
      className={[
        "group rounded-2xl border p-4 transition",
        active
          ? "border-emerald-900/40 bg-emerald-950/20"
          : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <div
          className={[
            "h-9 w-9 rounded-xl border grid place-items-center",
            active
              ? "bg-emerald-950/30 border-emerald-900/40 text-emerald-200"
              : "bg-zinc-800 border-zinc-700 text-zinc-200",
          ].join(" ")}
        >
          <Icon cat={cat} />
        </div>

        <div className="min-w-0">
          <div
            className={[
              "text-sm font-medium",
              active ? "text-emerald-200" : "text-zinc-100",
            ].join(" ")}
          >
            {CATEGORY_LABEL[cat]}
          </div>
          <div className="text-xs text-zinc-500">{count}개 문서</div>
        </div>
      </div>
    </Link>
  );
}

function AccordionItem({
  title,
  summary,
  href,
}: {
  title: string;
  summary: string;
  href: string;
}) {
  return (
    <details className="group rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-100 truncate">
            {title}
          </div>
        </div>
        <span className="text-zinc-500 transition group-open:rotate-180">▾</span>
      </summary>

      <div className="mt-3 text-sm text-zinc-400">
        {summary}
        <div className="mt-3">
          <Link
            href={href}
            className="inline-flex items-center text-sm text-emerald-300 hover:text-emerald-200"
          >
            자세히 보기 →
          </Link>
        </div>
      </div>
    </details>
  );
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const articles = getArticles();

  const categories = Object.keys(CATEGORY_LABEL) as HelpCategory[];

  const catRaw = resolvedSearchParams?.cat?.trim();

const cat: HelpCategory | undefined =
  catRaw && categories.includes(catRaw as HelpCategory)
    ? (catRaw as HelpCategory)
    : undefined;

  const q = (resolvedSearchParams?.q ?? "").trim().toLowerCase();

  const filtered = articles.filter((a) => {
    const byCat = cat ? a.category === cat : true;
    const byQ = q
      ? (a.title + " " + a.summary + " " + a.tags.join(" "))
          .toLowerCase()
          .includes(q)
      : true;
    return byCat && byQ;
  });

  const featured = articles.filter((a) => a.featured).slice(0, 7);

  const counts = articles.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {} as Record<HelpCategory, number>);

  return (
  <div className="space-y-6">

    <div className="text-xs text-red-400">
      catRaw: {String(resolvedSearchParams?.cat)} / cat: {String(cat)} / filtered: {filtered.length} / total: {articles.length}
    </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-lg font-semibold text-zinc-100">고객센터</h1>
        <p className="mt-1 text-sm text-zinc-400">
          자주 묻는 질문을 먼저 확인하고, 해결이 안 되면 문의로 이어가세요.
        </p>

        <form className="mt-4">
          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={resolvedSearchParams?.q ?? ""}
              placeholder="검색: 예) Focus, 캘린더, 제한, 데이터…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {cat ? <input type="hidden" name="cat" value={cat} /> : null}

            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
            >
              검색
            </button>
          </div>

          {(cat || q) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <span>
                필터:
                {cat ? ` ${CATEGORY_LABEL[cat]}` : " 전체"}{" "}
                {q ? ` · "${q}"` : ""}
              </span>
              <Link
                href="/dashboard/support"
                className="text-emerald-300 hover:text-emerald-200"
              >
                필터 초기화
              </Link>
            </div>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">자주 묻는 질문</h2>
          <span className="text-xs text-zinc-500">{featured.length}개 추천</span>
        </div>

        <div className="mt-4 space-y-2">
          {featured.map((a) => (
            <AccordionItem
              key={a.slug}
              title={a.title}
              summary={a.summary}
              href={`/dashboard/support/${a.slug}`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">FAQ</h2>
          {cat ? (
            <Link
              href="/dashboard/support"
              className="text-xs text-emerald-300 hover:text-emerald-200"
            >
              전체 보기
            </Link>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cItem) => (
            <CategoryButton
              key={cItem}
              cat={cItem}
              count={counts[cItem] ?? 0}
              active={cat === cItem}
            />
          ))}
        </div>

        <div className="mt-4">
          <Link
            href="/dashboard/support?compose=1"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-950/60 transition"
          >
            문의하기
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            {cat ? CATEGORY_LABEL[cat] : "전체 도움말"}
          </h2>
          <span className="text-xs text-zinc-500">{filtered.length}개</span>
        </div>

        <div className="mt-4 grid gap-2">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/dashboard/support/${a.slug}`}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:bg-zinc-950/60 transition"
            >
              <div className="text-sm font-medium text-zinc-100">{a.title}</div>
              <div className="mt-1 text-sm text-zinc-400">{a.summary}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
