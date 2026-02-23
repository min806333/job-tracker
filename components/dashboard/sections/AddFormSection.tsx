"use client";

import type { DashboardController } from "../hooks/useDashboardController";

const FREE_MAX_APPS = 100;

export function AddFormSection({ c }: { c: DashboardController }) {
  const plan = c.plan === "pro" ? "pro" : "free";
  const isFree = plan === "free";

  // c.apps가 전체 지원서 배열이라고 가정 (DashboardClient에서도 apps 쓰고 있음)
  const total = c.apps.length;
  const reachedLimit = isFree && total >= FREE_MAX_APPS;

  return (
    <section
      ref={c.addFormRef}
      className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">지원 추가</h2>
          <p className="mt-1 text-sm text-zinc-400">
            회사/직무만 먼저 추가하고, 마감/팔로업/Next Action은 옵션에서 천천히 채워도 돼요.
          </p>

          {/* ✅ FREE 제한 안내 (소프트) */}
          {reachedLimit ? (
            <div className="mt-3 rounded-xl border border-emerald-900/30 bg-emerald-950/15 px-4 py-3">
              <div className="text-sm font-semibold text-emerald-200">
                💚 FREE는 지원서 {FREE_MAX_APPS}개까지 저장할 수 있어요
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                지금 <span className="text-zinc-200 font-semibold">{total}</span>개가
                저장되어 있어요. Supporter로 전환하면 제한이 완화됩니다.
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

        <button
          onClick={c.addSampleData}
          className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
          title="샘플 데이터 추가"
        >
          샘플 추가
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <input
          ref={c.companyInputRef}
          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
          placeholder="회사명 (필수)"
          value={c.company}
          onChange={(e) => c.setCompany(e.target.value)}
          // 제한 걸렸을 때 입력은 막지 않음(소프트), 추가 버튼에서 처리
        />
        <input
          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
          placeholder="직무/포지션 (필수)"
          value={c.role}
          onChange={(e) => c.setRole(e.target.value)}
        />
        <input
          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
          placeholder="공고 URL (선택)"
          value={c.url}
          onChange={(e) => c.setUrl(e.target.value)}
        />
      </div>

      <details
        ref={c.addOptionsRef}
        className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4"
      >
        <summary className="cursor-pointer select-none text-sm text-zinc-300">
          옵션 추가 (마감/팔로업/Next/Source)
          <span className="ml-2 text-xs text-zinc-500">필요할 때만 펼치기</span>
        </summary>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <input
            type="date"
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            value={c.deadlineDate}
            onChange={(e) => c.setDeadlineDate(e.target.value)}
            title="마감일(선택)"
          />

          <input
            type="datetime-local"
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            value={c.followupLocal}
            onChange={(e) => c.setFollowupLocal(e.target.value)}
            title="팔로업 날짜(선택)"
          />

          <input
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            placeholder="Next action (선택) 예: 팔로업 메일 보내기"
            value={c.nextAction}
            onChange={(e) => c.setNextAction(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            placeholder="Source (선택) 예: 원티드/링크드인/지인추천"
            value={c.source}
            onChange={(e) => c.setSource(e.target.value)}
          />
        </div>

        <div className="mt-3 text-xs text-zinc-500 leading-relaxed">
          마감/팔로업을 넣으면 Today/Calendar에 자동으로 노출됩니다. Next action은 “오늘 할 일”을 적어두는 용도예요.
        </div>
      </details>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => {
            // ✅ FREE 제한 도달 시: 추가 대신 PaywallDrawer로 (소프트 제한)
            if (reachedLimit) {
              c.setPaywallOpen(true);
              return;
            }
            c.addFull();
          }}
          className={[
            "px-4 py-2 rounded-xl border font-medium transition",
            reachedLimit
              ? "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:bg-zinc-950/60"
              : "border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40",
          ].join(" ")}
          title={
            reachedLimit
              ? `FREE는 ${FREE_MAX_APPS}개까지 추가 가능해요`
              : "지원서 추가"
          }
        >
          {reachedLimit ? "Supporter로 제한 완화" : "추가"}
        </button>

        <div className="text-xs text-zinc-500">
          Tip: Today에서 <span className="text-zinc-200">N</span> 키로 빠른 추가를 토글할 수 있어요.
        </div>
      </div>
    </section>
  );
}