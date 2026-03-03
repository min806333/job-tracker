"use client";

import type { DashboardController } from "../hooks/useDashboardController";

const FREE_MAX_APPS = 100;

export function AddFormSection({
  c,
  readOnly = false,
}: {
  c: DashboardController;
  readOnly?: boolean;
}) {
  const plan = c.plan === "pro" ? "pro" : "free";
  const isFree = plan === "free";
  const total = c.apps.length;
  const reachedLimit = isFree && total >= FREE_MAX_APPS;

  return (
    <section ref={c.addFormRef} className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-start gap-3">
        <div>
          <h2 className="text-lg font-semibold">지원 추가</h2>
          <p className="mt-1 text-sm text-zinc-400">
            회사/직무를 먼저 저장하고, 마감/팔로업/다음 액션은 옵션에서 채워도 됩니다.
          </p>

          {readOnly ? (
            <div className="mt-3 rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
              읽기 전용 상태예요. 데이터는 안전하며 조회는 계속 가능합니다.
            </div>
          ) : null}

          {!readOnly && reachedLimit ? (
            <div className="mt-3 rounded-xl border border-emerald-900/30 bg-emerald-950/15 px-4 py-3">
              <div className="text-sm font-semibold text-emerald-200">
                FREE 플랜에서는 {FREE_MAX_APPS}개까지 저장할 수 있어요.
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                현재 <span className="font-semibold text-zinc-200">{total}</span>개가 저장되어 있어요.
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => c.setPaywallOpen(true)}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
                >
                  Supporter 보기
                </button>
              </div>
            </div>
          ) : null}
        </div>

      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <input
          ref={c.companyInputRef}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-50"
          placeholder="회사명(필수)"
          value={c.company}
          onChange={(e) => c.setCompany(e.target.value)}
          disabled={readOnly}
        />
        <input
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-50"
          placeholder="직무/포지션(필수)"
          value={c.role}
          onChange={(e) => c.setRole(e.target.value)}
          disabled={readOnly}
        />
        <input
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-50"
          placeholder="공고 URL(선택)"
          value={c.url}
          onChange={(e) => c.setUrl(e.target.value)}
          disabled={readOnly}
        />
      </div>

      <details ref={c.addOptionsRef} className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
        <summary className="cursor-pointer select-none text-sm text-zinc-300">
          옵션 추가 (마감/팔로업/다음 행동/출처)
        </summary>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <input
            type="date"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-50"
            value={c.deadlineDate}
            onChange={(e) => c.setDeadlineDate(e.target.value)}
            disabled={readOnly}
            title="마감일(선택)"
          />

          <input
            type="datetime-local"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-50"
            value={c.followupLocal}
            onChange={(e) => c.setFollowupLocal(e.target.value)}
            disabled={readOnly}
            title="팔로업 날짜(선택)"
          />

          <input
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-50"
            placeholder="다음 행동을 선택하세요"
            value={c.nextAction}
            onChange={(e) => c.setNextAction(e.target.value)}
            disabled={readOnly}
            title="다음 행동 (선택)"
          />

          <input
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 outline-none focus:border-zinc-600 disabled:opacity-50"
            placeholder="출처를 선택하세요"
            value={c.source}
            onChange={(e) => c.setSource(e.target.value)}
            disabled={readOnly}
            title="출처 (선택)"
          />
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => {
            if (readOnly) return;
            if (reachedLimit) {
              c.setPaywallOpen(true);
              return;
            }
            c.addFull();
          }}
          className={[
            "rounded-xl border px-4 py-2 font-medium transition disabled:opacity-50",
            reachedLimit
              ? "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:bg-zinc-950/60"
              : "border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40",
          ].join(" ")}
        >
          {reachedLimit ? "Supporter로 제한 완화" : "추가"}
        </button>

        <div className="text-xs text-zinc-500">Tip: Today에서 `N`으로 빠른 추가가 가능합니다.</div>
      </div>
    </section>
  );
}
