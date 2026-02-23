"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import SubpageHeader from "../../../../components/dashboard/common/SubpageHeader";

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "closed";
  user_email: string | null;
  created_at: string;
};

export default function AdminSupportPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [err, setErr] = useState<string | null>(null);

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
      setTickets([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, status, user_email, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) setErr(error.message);
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <SubpageHeader title="문의 관리" desc="관리자 전용: 모든 문의를 확인/처리합니다." />

        {!isAdmin && !loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300">
            접근 권한이 없어요. (is_admin=false)
          </div>
        ) : null}

        {err ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-red-300">
            로드 실패: {err}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">전체 문의</div>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <div className="mt-3 text-sm text-zinc-500">불러오는 중...</div>
          ) : tickets.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-500">문의가 없어요.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/admin/support/${t.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 hover:bg-zinc-900/40 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-100 truncate">{t.subject}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {t.user_email ?? "(no email)"} • {new Date(t.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 shrink-0">{t.status}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-zinc-500">
          * 관리자 권한은 profiles.is_admin=true 인 계정만 가능
        </div>
      </div>
    </main>
  );
}