"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardController } from "../hooks/useDashboardController";
import { Drawer } from "../common/Drawer";

const FREE_MAX_APPS = 100;
const FREE_FOCUS_VISIBLE = 1;
const PRO_FOCUS_VISIBLE = 3;

function normalizeReason(raw?: string) {
  const r = (raw ?? "").trim();
  if (!r) {
    return {
      title: "이 기능은 Supporter 전용이에요",
      body: "지금 사용하려는 기능은 Supporter에서 제공돼요.",
    };
  }

  return {
    title: "이 기능은 Supporter 전용이에요",
    body: r,
  };
}

export default function PaywallDrawer({ c }: { c: DashboardController }) {
  const router = useRouter();
  const [dontShowToday, setDontShowToday] = useState(false);

  const reason = useMemo(() => normalizeReason(c.paywallReason), [c.paywallReason]);

  function close() {
    c.setPaywallOpen(false);
    if (dontShowToday) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem("jt_paywall_snooze", today);
      } catch {}
    }
  }

  function goSupport() {
    close();
    const subject = encodeURIComponent("Supporter 업그레이드 문의");
    const message = encodeURIComponent(
      c.paywallReason || "Supporter 업그레이드 문의합니다."
    );
    router.push(`/dashboard/support?subject=${subject}&message=${message}`);
  }

  function goPlan() {
    close();
    router.push("/dashboard/plan");
  }

  return (
    <Drawer
      open={c.paywallOpen}
      onClose={close}
      title="💚 Supporter로 응원하기"
    >
      <div className="h-full flex justify-end">
        <div className="h-full w-[420px] max-w-[92vw] border-l border-zinc-800 bg-zinc-950">
          <div className="px-4 py-4 space-y-4">

            {/* ===== 이유 강조 ===== */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-500">지금 막힌 이유</div>
              <div className="mt-1 text-base font-semibold text-zinc-100">
                {reason.title}
              </div>
              <div className="mt-2 text-sm text-zinc-400 leading-relaxed">
                {reason.body}
              </div>

              {/* 결과 중심 혜택 강조 */}
              <div className="mt-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <div className="text-sm font-semibold text-emerald-200">
                  Supporter가 되면 바로 가능해요
                </div>
                <ul className="mt-2 text-sm text-emerald-100/90 space-y-1">
                  <li>• 중요한 지원 {PRO_FOCUS_VISIBLE}개를 한 번에 집중 관리</li>
                  <li>• 데이터를 CSV로 내보내 분석/백업 가능</li>
                  <li>• 제한 걱정 없이 계속 추가</li>
                </ul>
              </div>
            </div>

            {/* ===== 플랜 비교 ===== */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="font-medium text-zinc-100">FREE</div>
              <ul className="mt-2 text-sm text-zinc-400 space-y-1">
                <li>• Applications 최대 {FREE_MAX_APPS}개</li>
                <li>• Focus Top {FREE_FOCUS_VISIBLE}개 표시</li>
                <li>• CSV 내보내기 제한</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/30 p-4 shadow-[0_0_24px_rgba(16,185,129,0.18)]">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-emerald-200">SUPPORTER</div>
                <span className="text-xs text-emerald-100/70">응원형 · 강제 결제 X</span>
              </div>
              <ul className="mt-2 text-sm text-emerald-100/90 space-y-1">
                <li>• Applications 제한 완화</li>
                <li>• Focus Top {PRO_FOCUS_VISIBLE}개 표시</li>
                <li>• CSV 내보내기 가능</li>
              </ul>
              <div className="mt-3 text-xs text-emerald-100/70">
                * 결제 강요는 없어요. “응원 + 배지 + 편의 기능” 중심이에요.
              </div>
            </div>

            {/* ===== CTA 구조 재정렬 ===== */}
            <div className="space-y-2 pt-2">

              {/* Primary */}
              <button
                type="button"
                onClick={goSupport}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-white font-semibold hover:bg-emerald-500 transition shadow-lg"
              >
                Supporter 문의하기
              </button>

              {/* Secondary (심리적 안정 버튼) */}
              <button
                type="button"
                onClick={close}
                className="w-full rounded-xl bg-zinc-900/40 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition"
              >
                지금은 계속 무료로 사용할래요
              </button>

              {/* Tertiary */}
              <button
                type="button"
                onClick={goPlan}
                className="w-full text-sm text-zinc-400 hover:text-zinc-200 transition"
              >
                내 플랜 / 혜택 보기
              </button>
            </div>

            {/* ===== Snooze ===== */}
            <label className="flex items-center gap-2 pt-2 text-[11px] text-zinc-500 opacity-60">
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="accent-emerald-500"
              />
              오늘은 이 안내를 그만 보기
            </label>

            <div className="text-[11px] text-zinc-600">
              * Stripe 결제 연동 전까지는 “문의 → 수동 Supporter 부여”로 운영 가능
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}