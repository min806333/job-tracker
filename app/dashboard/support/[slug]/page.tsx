import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getArticleBySlug, CATEGORY_LABEL } from "@/lib/help/articles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TicketStatus = "open" | "in_progress" | "closed" | string;

type SupportTicketDetail = {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  created_at: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function ticketStatusLabel(status: TicketStatus) {
  if (status === "closed") return "해결 완료";
  if (status === "in_progress") return "확인 중";
  return "접수됨";
}

function renderSimpleMarkdown(md: string) {
  const lines = md.trim().split("\n");
  const out: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;

    if (l.startsWith("## ")) {
      out.push(
        <h2 key={key++} className="mt-6 text-sm font-semibold text-zinc-200">
          {l.replace("## ", "")}
        </h2>
      );
      continue;
    }

    if (l.startsWith("- ") || l.startsWith("• ")) {
      out.push(
        <li key={key++} className="ml-5 list-disc text-sm text-zinc-300">
          {l.replace(/^(- |• )/, "")}
        </li>
      );
      continue;
    }

    if (/^\d+\./.test(l)) {
      out.push(
        <div key={key++} className="text-sm text-zinc-300">
          {l}
        </div>
      );
      continue;
    }

    out.push(
      <p key={key++} className="text-sm text-zinc-300">
        {l}
      </p>
    );
  }

  return <div className="space-y-2">{out}</div>;
}

async function renderTicketDetail(slug: string, showCreatedMessage: boolean) {
  if (!isUuid(slug)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, message, status, created_at")
    .eq("id", slug)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const ticket = data as SupportTicketDetail;

  return (
    <div className="space-y-6">
      {showCreatedMessage ? (
        <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
          문의가 정상적으로 접수되었어요.
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard/support"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-950/50 hover:text-zinc-100"
          >
            <span className="text-base leading-none">←</span>
            <span>고객센터</span>
          </Link>
          <Link
            href="/dashboard/support/new"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            새 문의
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs text-zinc-500">내 문의 상세</div>
            <h1 className="mt-1 text-lg font-semibold text-zinc-100">{ticket.subject}</h1>
          </div>
          <div className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300">
            {ticketStatusLabel(ticket.status)}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">{new Date(ticket.created_at).toLocaleString("ko-KR")}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-xs text-zinc-500">내용</div>
        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{ticket.message}</pre>
      </div>
    </div>
  );
}

function renderArticlePage(slug: string) {
  const article = getArticleBySlug(slug);
  if (!article) {
    return null;
  }

  const composeHref = `/dashboard/support/new?subject=${encodeURIComponent(
    article.title
  )}&message=${encodeURIComponent(
    `도움말을 봤지만 해결이 안 됐어요.\n\n문제:\n\n환경(브라우저/OS):\n\n관련 도움말: /dashboard/support/${article.slug}`
  )}`;

  const improveHref = `/dashboard/support/new?subject=${encodeURIComponent(
    `[도움말 개선] ${article.title}`
  )}&message=${encodeURIComponent(
    `이 도움말에서 부족했던 점:\n\n(어떤 부분이 헷갈렸는지 적어주세요)\n\n관련 도움말: /dashboard/support/${article.slug}`
  )}`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-950/50 hover:text-zinc-100"
            >
              <span className="text-base leading-none">←</span>
              <span>고객센터</span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-950/50 hover:text-zinc-100"
            >
              <span>대시보드</span>
              <span className="text-base leading-none">→</span>
            </Link>
          </div>

          <Link
            href={composeHref}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            문의하기
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          {CATEGORY_LABEL[article.category]} · 업데이트 {article.updatedAt}
        </div>
        <h1 className="mt-2 text-lg font-semibold text-zinc-100">{article.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{article.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/support"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-950/60"
          >
            ← 고객센터
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-950/60"
          >
            대시보드로 →
          </Link>

          <Link
            href={composeHref}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            문의로 이어가기
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">{renderSimpleMarkdown(article.body)}</div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-sm font-medium text-zinc-100">도움이 됐나요?</div>
        <p className="mt-1 text-sm text-zinc-400">피드백은 다음 도움말 개선에 반영돼요.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/support"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-950/60"
          >
            👍 도움 됨
          </Link>
          <Link
            href={improveHref}
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-950/60"
          >
            👎 개선 필요
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function SupportSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ created?: string }>;
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const showCreatedMessage = resolvedSearchParams?.created === "1";
  const articlePage = renderArticlePage(slug);
  if (articlePage) {
    return articlePage;
  }

  return renderTicketDetail(slug, showCreatedMessage);
}
