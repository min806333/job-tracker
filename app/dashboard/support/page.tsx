"use client";

import Link from "next/link";
import { Suspense, useMemo, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getArticles,
  CATEGORY_LABEL,
  type HelpCategory,
} from "@/lib/help/articles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SupportTicket = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed" | string;
  created_at: string;
};

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

function SupportPageContent() {
  const sp = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const articles = getArticles();
  const categories = Object.keys(CATEGORY_LABEL) as HelpCategory[];

  // ✅ cat은 계속 URL query에서 유지
  const catRaw = sp.get("cat")?.trim() ?? "";
  const cat: HelpCategory | undefined = categories.includes(catRaw as HelpCategory)
    ? (catRaw as HelpCategory)
    : undefined;
  const showCreatedMessage = sp.get("created") === "1";

  // ✅ 검색은 실시간 state로
  const initialQ = sp.get("q")?.trim() ?? "";
  const [search, setSearch] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let mounted = true;

    async function loadMyTickets() {
      setTicketsLoading(true);
      setTicketsError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!userData.user) {
        setTickets([]);
        setTicketsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, status, created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!mounted) return;

      if (error) {
        setTickets([]);
        setTicketsError("내 문의를 불러오지 못했어요.");
      } else {
        setTickets((data ?? []) as SupportTicket[]);
      }

      setTicketsLoading(false);
    }

    void loadMyTickets();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const q = debouncedQ.trim().toLowerCase();

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const byCat = cat ? a.category === cat : true;
      const byQ = q
        ? (a.title + " " + a.summary + " " + a.tags.join(" "))
            .toLowerCase()
            .includes(q)
        : true;
      return byCat && byQ;
    });
  }, [articles, cat, q]);

  const featured = useMemo(
    () => articles.filter((a) => a.featured).slice(0, 7),
    [articles]
  );

  const counts = useMemo(() => {
    return articles.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {} as Record<HelpCategory, number>);
  }, [articles]);

  const showFilterBar = Boolean(cat || search.trim());

  function ticketStatusLabel(status: SupportTicket["status"]) {
    if (status === "closed") return "해결 완료";
    if (status === "in_progress") return "확인 중";
    return "접수됨";
  }

  return (
    <div className="space-y-6">
      {showCreatedMessage ? (
        <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
          문의가 정상적으로 접수되었어요.
        </div>
      ) : null}

      {/* Top nav */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-950/50 hover:text-zinc-100 transition"
        >
          <span className="text-base leading-none">←</span>
          <span className="hidden sm:inline">대시보드로 돌아가기</span>
          <span className="sm:hidden">대시보드</span>
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">고객센터</h1>
            <p className="mt-1 text-sm text-zinc-400">
              자주 묻는 질문을 먼저 확인하고, 해결이 안 되면 문의로 이어가세요.
            </p>
          </div>

          <Link
            href="/dashboard/support/new"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          >
            새 문의
          </Link>
        </div>

        {/* Search (실시간) */}
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색: 예) Focus, 캘린더, 제한, 데이터…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {/* 버튼은 있어도 되고 없어도 됨. UX상 '지우기'가 더 유용 */}
            {search.trim() ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-950/60 transition"
              >
                지우기
              </button>
            ) : null}
          </div>

          {showFilterBar && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <span>
                필터:
                {cat ? ` ${CATEGORY_LABEL[cat]}` : " 전체"}
                {search.trim() ? ` · "${search.trim()}"` : ""}
              </span>
              <Link
                href="/dashboard/support"
                className="text-emerald-300 hover:text-emerald-200"
              >
                필터 초기화
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">내 문의</h2>
          <Link
            href="/dashboard/support/new"
            className="text-xs text-emerald-300 hover:text-emerald-200"
          >
            문의 작성
          </Link>
        </div>

        {ticketsLoading ? (
          <div className="mt-4 text-sm text-zinc-500">불러오는 중...</div>
        ) : ticketsError ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-red-300">
            {ticketsError}
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-400">
            아직 작성한 문의가 없어요. 새 문의를 남겨보세요.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/support/${ticket.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 transition hover:bg-zinc-950/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-100">
                      {ticket.subject}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {new Date(ticket.created_at).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-300">
                    {ticketStatusLabel(ticket.status)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top: Frequently asked */}
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

      {/* Categories grid */}
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
            href="/dashboard/support/new"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:bg-zinc-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            문의하기
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            {cat ? CATEGORY_LABEL[cat] : "전체 도움말"}
          </h2>
          <span className="text-xs text-zinc-500">{filtered.length}개</span>
        </div>

        <div className="mt-4 grid gap-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center text-sm text-zinc-400">
              검색 결과가 없어요 😢 다른 키워드로 시도해보세요.
            </div>
          ) : (
            filtered.map((a) => (
              <Link
                key={a.slug}
                href={`/dashboard/support/${a.slug}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:bg-zinc-950/60 transition"
              >
                <div className="text-sm font-medium text-zinc-100">
                  {a.title}
                </div>
                <div className="mt-1 text-sm text-zinc-400">{a.summary}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">도움말을 불러오는 중...</div>}>
      <SupportPageContent />
    </Suspense>
  );
}
