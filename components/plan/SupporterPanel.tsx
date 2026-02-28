import Link from "next/link";

export function SupporterPanel({ plan }: { plan: "free" | "pro" | "grace" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-sm font-semibold text-zinc-100">
        {plan === "pro" ? "프로젝트를 후원해 주셔서 감사합니다." : "프로젝트 후원"}
      </div>

      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        핵심 기능은 계속 무료로 제공됩니다. 후원 플랜은 서버 및 제품 운영 비용에
        도움이 되며, 더 높은 한도와 우선 기능 요청 혜택을 제공합니다.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
          더 높은 한도
        </span>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
          우선 기능 요청
        </span>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
          개발 지원
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href="/dashboard/upgrade"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
        >
          업그레이드
        </Link>

        <Link
          href="/dashboard/support"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-950/40"
        >
          문의하기
        </Link>
      </div>
    </div>
  );
}
