"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm text-zinc-300">
      <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-zinc-800 bg-zinc-950/60 flex items-center justify-center text-xs text-zinc-200">
        ✓
      </div>
      <div className="leading-6">{text}</div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  subtitle,
  cta,
  highlight,
  features,
  onClick,
}: {
  title: string;
  price: string;
  subtitle: string;
  cta: string;
  highlight?: boolean;
  features: string[];
  onClick: () => void;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-6",
        highlight
          ? "border-emerald-900/50 bg-emerald-950/10"
          : "border-zinc-800 bg-zinc-950/60",
      ].join(" ")}
    >
      <div className="text-2xl font-semibold text-zinc-100">{title}</div>

      <div className="mt-3 text-4xl font-semibold text-zinc-100">
        {price}
        <span className="ml-1 text-sm font-normal text-zinc-400">/월</span>
      </div>

      <div className="mt-2 text-sm text-zinc-400">{subtitle}</div>

      <button
        type="button"
        onClick={onClick}
        className={[
          "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-medium transition",
          highlight
            ? "bg-emerald-500/15 text-emerald-100 border border-emerald-900/40 hover:bg-emerald-500/20"
            : "bg-zinc-950/60 text-zinc-100 border border-zinc-800 hover:bg-zinc-900/40",
        ].join(" ")}
      >
        {cta}
      </button>

      <div className="mt-6 space-y-3">
        {features.map((f) => (
          <FeatureRow key={f} text={f} />
        ))}
      </div>
    </div>
  );
}

export default function UpgradePage() {
  const router = useRouter();

  function goSupport() {
    const subject = encodeURIComponent("Plus 후원 문의");
    const message = encodeURIComponent(
      "Plus(₩1,900) 후원을 하고 싶습니다.\n\n결제 방법 안내 부탁드립니다."
    );
    router.push(`/dashboard/support?subject=${subject}&message=${message}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Free / Plus
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              취준생을 위한 실행 중심 트래커입니다.  
              대부분 기능은 무료로 제공됩니다.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-900/50 transition"
          >
            ← 대시보드
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* FREE */}
          <PlanCard
            title="Free"
            price="₩0"
            subtitle="AI가 할 수 있는 일 알아보기"
            cta="Free 사용하기"
            features={[
              "지원 항목 추적",
              "Focus Top 3",
              "Today / List / Calendar",
              "기본 리포트",
            ]}
            onClick={() => router.push("/dashboard")}
          />

          {/* PLUS */}
          <PlanCard
            title="Plus"
            price="₩1,900"
            subtitle="서비스를 응원하고 기능 개선에 기여"
            highlight
            cta="Plus 응원하기"
            features={[
              "서포터 배지(추후)",
              "기능 요청 우선 반영",
              "개발 후원자 감사 표기",
              "서버 운영비 지원",
            ]}
            onClick={goSupport}
          />
        </div>

        <div className="mt-10 text-xs text-zinc-500 text-center">
          * Plus는 의무가 아닌 선택입니다.  
          서비스가 도움이 된다면 응원해 주세요 ☕
        </div>
      </div>
    </main>
  );
}