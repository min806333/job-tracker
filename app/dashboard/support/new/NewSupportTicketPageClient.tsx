"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { sanitizeTextForClipboard } from "@/lib/text/sanitize";

type FormErrors = {
  subject?: string;
  message?: string;
};

export default function NewSupportTicketPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const initialSubject = sanitizeTextForClipboard(searchParams.get("subject") ?? "");
  const initialMessage = sanitizeTextForClipboard(searchParams.get("message") ?? "");

  const [subject, setSubject] = useState(initialSubject.trim());
  const [message, setMessage] = useState(initialMessage.trim());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    const subjectTrimmed = subject.trim();
    const messageTrimmed = message.trim();

    if (!subjectTrimmed) {
      nextErrors.subject = "제목을 입력해 주세요.";
    }

    if (!messageTrimmed) {
      nextErrors.message = "내용을 입력해 주세요.";
    }

    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          requester_email: user.email ?? null,
          subject: subjectTrimmed,
          message: messageTrimmed,
          status: "open",
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      if (data?.id) {
        router.replace(`/dashboard/support/${data.id}?created=1`);
      } else {
        router.replace("/dashboard/support?created=1");
      }
    } catch {
      setSubmitError("전송에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
        <div className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
          <div>
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              고객센터로 돌아가기
            </Link>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-zinc-100">문의하기</h1>
            <p className="mt-2 text-sm text-zinc-400">
              문제 상황이나 요청사항을 자세히 남겨 주세요. 최대한 빠르게 도와드릴게요.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="subject" className="mb-2 block text-sm text-zinc-300">
                제목
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="예: 결제 완료 후에도 Pro로 바뀌지 않아요"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                disabled={submitting}
              />
              {errors.subject ? <p className="mt-2 text-sm text-red-300">{errors.subject}</p> : null}
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-sm text-zinc-300">
                내용
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="상황을 자세히 적어 주세요. (가능하면 날짜/화면/재현 방법 포함)"
                className="min-h-44 w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                disabled={submitting}
              />
              {errors.message ? <p className="mt-2 text-sm text-red-300">{errors.message}</p> : null}
            </div>

            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-3">
              <p className="text-sm text-zinc-300">첨부 (선택)</p>
              <p className="mt-1 text-sm text-zinc-500">스크린샷/이미지 첨부 기능은 추후 지원 예정입니다.</p>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/support"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200 transition hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "전송 중..." : "보내기"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
