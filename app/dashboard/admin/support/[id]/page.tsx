"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "../../../../../lib/supabase/browser";
import SubpageHeader from "../../../../../components/dashboard/common/SubpageHeader";

type Status = "open" | "in_progress" | "closed";

type TicketDetail = {
  id: string;
  subject: string;
  message: string;
  status: Status;
  user_email: string | null;
  created_at: string;
  admin_note: string | null;
};

export default function AdminSupportDetailPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [status, setStatus] = useState<Status>("open");
  const [adminNote, setAdminNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function pushToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user;
    if (!u) {
      location.href = "/login";
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", u.id)
      .single();

    const admin = !!(prof as any)?.is_admin;
    setIsAdmin(admin);
    if (!admin) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, user_email, created_at, admin_note")
      .eq("id", id)
      .single();

    if (error) {
      setErr(error.message);
      setTicket(null);
    } else {
      const t = data as TicketDetail;
      setTicket(t);
      setStatus(t.status);
      setAdminNote(t.admin_note ?? "");
    }

    setLoading(false);
  }

  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    if (!ticket) return;
    setSaving(true);

    const { error } = await supabase
      .from("support_tickets")
      .update({ status, admin_note: adminNote.trim() ? adminNote.trim() : null })
      .eq("id", ticket.id);

    setSaving(false);

    if (error) return pushToast("저장 실패: " + error.message);

    pushToast("저장됨 ✓");
    await load();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <SubpageHeader
          title="문의 처리"
          desc="관리자 전용: 상태 변경/메모 기록"
          backHref="/dashboard/admin/support"
          backLabel="문의 관리"
        />

        {!loading && !isAdmin ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300">
            접근 권한이 없어요. (is_admin=false)
          </div>
        ) : null}

        {err ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-red-300">
            로드 실패: {err}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 text-sm text-zinc-500">불러오는 중...</div>
        ) : !ticket ? null : (
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-500">제목</div>
              <div className="mt-1 text-lg font-semibold">{ticket.subject}</div>
              <div className="mt-2 text-xs text-zinc-500">
                {ticket.user_email ?? "(no email)"} • {new Date(ticket.created_at).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-500">내용</div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-200 leading-6">{ticket.message}</pre>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-sm font-medium text-zinc-100">처리</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-zinc-300 mb-1">상태</div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-700"
                  >
                    <option value="open">open</option>
                    <option value="in_progress">in_progress</option>
                    <option value="closed">closed</option>
                  </select>
                </div>

                <div>
                  <div className="text-sm text-zinc-300 mb-1">관리자 메모</div>
                  <input
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-700"
                    placeholder="예) 재현됨, 다음 배포에 수정"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
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