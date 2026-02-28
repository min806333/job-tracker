"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Plan = "free" | "pro" | "grace";

type ProfileRow = {
  id: string;
  plan: Plan;
  plan_status: string;
  updated_at: string;
};

function Item({
  title,
  desc,
  onClick,
  href,
}: {
  title: string;
  desc?: string;
  onClick?: () => void;
  href?: string;
}) {
  const base =
    "w-full text-left flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-900/50 transition";
  const left = (
    <div className="min-w-0">
      <div className="font-medium text-zinc-100">{title}</div>
      {desc ? <div className="text-sm text-zinc-400 mt-0.5">{desc}</div> : null}
    </div>
  );
  const right = <div className="text-zinc-500">›</div>;

  if (href) {
    return (
      <a className={base} href={href}>
        {left}
        {right}
      </a>
    );
  }

  return (
    <button className={base} onClick={onClick} type="button">
      {left}
      {right}
    </button>
  );
}

export default function ProfileClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [plan, setPlan] = useState<Plan>("free");
  const [planStatus, setPlanStatus] = useState<string>("active");

  const [toast, setToast] = useState<string | null>(null);
  function pushToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user;

      if (!u) {
        router.push("/login");
        router.refresh();
        return;
      }

      if (!alive) return;
      setUserEmail(u.email ?? "");
      setUserId(u.id);

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id, plan, plan_status, updated_at")
        .eq("id", u.id)
        .single();

      if (!alive) return;

      if (!error && prof) {
        const p = (prof as ProfileRow).plan === "pro" ? "pro" : (prof as ProfileRow).plan === "grace" ? "grace" : "free";
        setPlan(p);
        setPlanStatus((prof as ProfileRow).plan_status ?? "active");
      } else {
        setPlan("free");
        setPlanStatus("active");
      }

      setLoading(false);
    }

    void load();
    return () => {
      alive = false;
    };
  }, [supabase, router]);

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  function openAccountDetails() {
    // ✅ 이미 라우트가 있으면 실제 페이지로 이동 (없으면 toast 유지해도 됨)
    router.push("/dashboard/account");
  }

  function openSettings() {
    router.push("/dashboard/settings");
  }

  function openPlan() {
    // 지금은 상태 확인용 (추후 결제 연결 시 /dashboard/plan 으로)
    pushToast(
      `내 플랜: ${plan === "pro" ? "SUPPORTER" : plan === "grace" ? "GRACE" : "FREE"} (${planStatus})`
    );
  }

  function openHelp() {
    // help 문서가 없으면 support로 보내는 게 UX가 더 좋음
    router.push("/dashboard/support");
  }

  function openSupport() {
    router.push("/dashboard/support");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-6">
          <div className="text-2xl font-semibold tracking-tight">프로필</div>
          <div className="text-sm text-zinc-400 mt-1">
            {loading ? "불러오는 중..." : `${userEmail || "(no email)"}`}
          </div>

          {/* 상태 배지 */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1">
            <span className="text-xs text-zinc-400">Plan</span>
            <span className="text-xs font-medium text-zinc-100">
              {plan === "pro" ? "SUPPORTER" : plan === "grace" ? "GRACE" : "FREE"}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">{planStatus}</span>
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-3">
          <Item
            title="대시보드로"
            desc="Today / List / Calendar / Report"
            onClick={() => router.push("/dashboard")}
          />

          <Item
            title="계정 상세 정보"
            desc={userId ? `ID: ${userId.slice(0, 8)}…` : undefined}
            onClick={openAccountDetails}
          />
          <Item title="설정" desc="알림/테마/단축키(추후)" onClick={openSettings} />

          <Item title="내 플랜" desc={`현재: ${plan === "pro" ? "SUPPORTER" : plan === "grace" ? "GRACE" : "FREE"}`} onClick={openPlan} />

          <Item title="도움말" desc="사용 가이드/FAQ" onClick={openHelp} />
          <Item title="고객센터" desc="문의/피드백" onClick={openSupport} />

          <Item title="로그아웃" desc="현재 계정에서 로그아웃" onClick={logout} />
        </div>

        {/* Toast (간단 버전) */}
        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="rounded-full border border-zinc-800 bg-zinc-950/90 px-4 py-2 text-sm text-zinc-100 shadow-lg">
              {toast}
            </div>
          </div>
        ) : null}

        <div className="mt-8 text-xs text-zinc-500">
          * 여기 화면은 MVP용 “프로필 허브”예요. 상세 기능은 추후 확장합니다.
        </div>
      </div>
    </main>
  );
}