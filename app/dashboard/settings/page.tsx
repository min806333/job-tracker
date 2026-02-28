"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";
import SubpageHeader from "../../../components/dashboard/common/SubpageHeader";

type ViewMode = "TODAY" | "LIST" | "CALENDAR" | "REPORT";
type ProfileSettingsRow = {
  default_view_mode?: ViewMode | null;
  today_window_days?: number | null;
};

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [defaultView, setDefaultView] = useState<ViewMode>("TODAY");
  const [todayWindowDays, setTodayWindowDays] = useState<3 | 7>(3);

  const [toast, setToast] = useState<string | null>(null);
  function pushToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user;
    if (!u) {
      location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("profile_settings")
      .select("default_view_mode, today_window_days")
      .eq("user_id", u.id)
      .single();

    const settings = (data as ProfileSettingsRow | null) ?? null;
    setDefaultView(settings?.default_view_mode ?? "TODAY");
    setTodayWindowDays((settings?.today_window_days ?? 3) === 7 ? 7 : 3);

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
          default_view_mode: defaultView,
          today_window_days: todayWindowDays,
        },
        { onConflict: "user_id" }
      );

    setSaving(false);

    if (error) return pushToast("저장 실패: " + error.message);
    pushToast("저장됨 ✓");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <SubpageHeader title="설정" desc="대시보드 기본 동작을 설정합니다." />

        {loading ? (
          <div className="mt-6 text-sm text-zinc-500">불러오는 중...</div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-sm font-medium text-zinc-100">기본 화면</div>
              <div className="mt-2 text-sm text-zinc-400">로그인 후 처음 보여줄 탭</div>

              <select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value as ViewMode)}
                className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="TODAY">Today</option>
                <option value="CALENDAR">Calendar</option>
                <option value="LIST">List</option>
                <option value="REPORT">Report</option>
              </select>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-sm font-medium text-zinc-100">Today 범위</div>
              <div className="mt-2 text-sm text-zinc-400">마감/팔로업을 몇 일 범위로 볼지</div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTodayWindowDays(3)}
                  className={`rounded-xl border px-4 py-2 transition ${
                    todayWindowDays === 3
                      ? "border-zinc-600 bg-zinc-900/40"
                      : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/30"
                  }`}
                >
                  3일
                </button>
                <button
                  type="button"
                  onClick={() => setTodayWindowDays(7)}
                  className={`rounded-xl border px-4 py-2 transition ${
                    todayWindowDays === 7
                      ? "border-zinc-600 bg-zinc-900/40"
                      : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/30"
                  }`}
                >
                  7일
                </button>
              </div>
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

            <div className="text-xs text-zinc-500">
              * 다음 단계: 이 설정을 대시보드 컨트롤러가 읽어서 실제 동작에 반영합니다.
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
