import { getArticleBySlug, CATEGORY_LABEL } from "@/lib/help/articles";
import Link from "next/link";
import { notFound } from "next/navigation";

function renderSimpleMarkdown(md: string) {
  // 아주 단순 렌더(헤더/리스트/문단). 나중에 markdown renderer로 교체 가능.
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

export default function SupportArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = getArticleBySlug(params.slug);
  if (!article) return notFound();

  const composeHref = `/dashboard/support?subject=${encodeURIComponent(
    article.title
  )}&message=${encodeURIComponent(
    `도움말을 봤지만 해결이 안 됐어요.\n\n문제:\n\n환경(브라우저/OS):\n\n관련 도움말: /dashboard/support/${article.slug}`
  )}`;

  const improveHref = `/dashboard/support?subject=${encodeURIComponent(
    `[도움말 개선] ${article.title}`
  )}&message=${encodeURIComponent(
    `이 도움말에서 부족했던 점:\n\n(어떤 부분이 헷갈렸는지 적어주세요)\n\n관련 도움말: /dashboard/support/${article.slug}`
  )}`;

  return (
    <div className="space-y-6">
      {/* Top nav (Dashboard back + Support back) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-950/50 hover:text-zinc-100 transition"
            >
              <span className="text-base leading-none">←</span>
              <span className="hidden sm:inline">고객센터</span>
              <span className="sm:hidden">고객센터</span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-950/50 hover:text-zinc-100 transition"
            >
              <span className="hidden sm:inline">대시보드</span>
              <span className="sm:hidden">대시보드</span>
              <span className="text-base leading-none">→</span>
            </Link>
          </div>

          <Link
            href={composeHref}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
          >
            문의하기
          </Link>
        </div>
      </div>

      {/* Article header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-xs text-zinc-500 uppercase tracking-wide">
          {CATEGORY_LABEL[article.category]} · 업데이트 {article.updatedAt}
        </div>
        <h1 className="mt-2 text-lg font-semibold text-zinc-100">
          {article.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">{article.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/support"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/60 transition"
          >
            ← 고객센터
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/60 transition"
          >
            대시보드로 →
          </Link>

          <Link
            href={composeHref}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
          >
            문의로 이어가기
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        {renderSimpleMarkdown(article.body)}
      </div>

      {/* Feedback */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-sm font-medium text-zinc-100">도움이 됐나요?</div>
        <p className="mt-1 text-sm text-zinc-400">
          피드백은 다음 도움말 개선에 반영돼요.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/support"
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/60 transition"
          >
            👍 도움 됨
          </Link>
          <Link
            href={improveHref}
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-950/60 transition"
          >
            👎 개선 필요
          </Link>
        </div>
      </div>
    </div>
  );
}