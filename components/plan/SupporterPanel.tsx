import Link from "next/link";

export function SupporterPanel({ plan }: { plan: "free" | "pro" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-sm font-semibold text-zinc-100">
        {plan === "pro" ? "💚 Supporter로 응원해주고 있어요" : "☕ 커피 한 잔으로 응원하기"}
      </div>

      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        이 서비스는 대부분 기능을 무료로 제공합니다. <br />
        Supporter는 서버 운영비를 응원해주는 선택 옵션이며,
        배지 표시와 기능 요청 우선 반영 같은 감사 혜택이 포함돼요.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
          배지 표시
        </span>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
          기능 요청 우선 반영
        </span>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
          운영비 지원
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          href="/dashboard/upgrade"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
        >
          응원하기
        </Link>

        <Link
          href="/dashboard/support"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-transparent px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-950/40"
        >
          기능 요청/문의
        </Link>
      </div>
    </div>
  );
}