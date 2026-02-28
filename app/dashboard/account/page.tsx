"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";
import SubpageHeader from "../../../components/dashboard/common/SubpageHeader";

type Plan = "free" | "pro" | "grace";
type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
};
type ProfileRow = {
  plan?: Plan | null;
  plan_status?: string | null;
};
type ProfileSettingsRow = {
  display_name?: string | null;
  timezone?: string | null;
};

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string>("");

  const [plan, setPlan] = useState<Plan>("free");
  const [planStatus, setPlanStatus] = useState("active");

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");

  const [toast, setToast] = useState<string | null>(null);
  function pushToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  const load = useCallback(async () => {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const u = (auth?.user as AuthUser | null) ?? null;
    if (!u) {
      location.href = "/login";
      return;
    }

    setUserId(u.id);
    setEmail(u.email ?? "");
    setCreatedAt(u.created_at ?? "");

    // profiles (read-only)
    const { data: prof } = await supabase
      .from("profiles")
      .select("plan, plan_status")
      .eq("id", u.id)
      .single();

    const profRow = (prof as ProfileRow | null) ?? null;
    setPlan(profRow?.plan === "pro" ? "pro" : profRow?.plan === "grace" ? "grace" : "free");
    setPlanStatus(profRow?.plan_status ?? "active");

    // profile_settings (editable)
    const { data: s } = await supabase
      .from("profile_settings")
      .select("display_name, timezone")
      .eq("user_id", u.id)
      .single();

    const settings = (s as ProfileSettingsRow | null) ?? null;
    setDisplayName(settings?.display_name ?? "");
    setTimezone(settings?.timezone ?? "");

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user;
    if (!u) {
      setSaving(false);
      location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("profile_settings")
      .upsert(
        {
          user_id: u.id,
          display_name: displayName.trim() ? displayName.trim() : null,
          timezone: timezone.trim() ? timezone.trim() : null,
        },
        { onConflict: "user_id" }
      );

    setSaving(false);

    if (error) return pushToast("저장 실패: " + error.message);

    pushToast("저장됨 ✓");
    await load();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <SubpageHeader title="계정 상세 정보" desc="프로필/표시 이름 등을 관리합니다." />

        {loading ? (
          <div className="mt-6 text-sm text-zinc-500">불러오는 중...</div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-sm text-zinc-400">이메일</div>
              <div className="mt-1 font-medium">{email}</div>

              <div className="mt-3 text-xs text-zinc-500">User ID: {userId}</div>
              {createdAt ? <div className="mt-1 text-xs text-zinc-500">Created: {new Date(createdAt).toLocaleString()}</div> : null}

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1">
                <span className="text-xs text-zinc-400">Plan</span>
                <span className={`text-xs font-semibold ${plan === "pro" ? "text-emerald-400" : "text-zinc-100"}`}>
                  {plan === "grace" ? "GRACE" : plan.toUpperCase()}
                </span>
                <span className="text-xs text-zinc-600">•</span>
                <span className="text-xs text-zinc-400">{planStatus}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-sm font-medium text-zinc-100">프로필</div>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-sm text-zinc-300 mb-1">표시 이름</div>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="예) Alex"
                  />
                </div>

                <div>
                  <div className="text-sm text-zinc-300 mb-1">시간대(Timezone)</div>
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="예) Asia/Seoul"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 hover:bg-zinc-900/50 transition disabled:opacity-60"
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="rounded-full border border-zinc-800 bg-zinc-950/90 px-4 py-2 text-sm text-zinc-100 shadow-lg">
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
