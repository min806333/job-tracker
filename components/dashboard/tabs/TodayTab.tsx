"use client";

import type { DashboardController } from "../hooks/useDashboardController";
import { ZeroStateCard } from "../common/ZeroStateCard";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { AppCard } from "../common/AppCard";
import type { Application } from "../../../lib/applications/types";

import { STAGES } from "../../../lib/applications/types";
import { stageBadgeClass, stageLabel, formatDateOnly } from "../../../lib/applications/selectors";
import { priorityHint } from "../../../lib/applications/scoring";

export default function TodayTab({ c }: { c: DashboardController }) {
  const isPro = c.plan === "pro";
  const focusLimit = isPro ? 3 : 1;

  // ✅ NEW: Controller에서 계산된 Today Focus (plan 반영)
  const focusVisible = c.todayFocusVisible ?? [];
  const hasMoreFocus = (c.todayFocusTop3?.length ?? 0) > focusVisible.length;

  return (
    <section className="mt-6 space-y-6">
      {c.apps.length === 0 ? (
        <ZeroStateCard
          title="아직 등록된 지원이 없어요"
          description="회사/직무만 먼저 추가하고, 마감/팔로업/Next Action은 나중에 넣어도 됩니다."
          primary={{ label: "➕ 첫 카드 추가", onClick: c.goToAddForm }}
          secondary={{ label: "✨ 샘플 데이터 추가", onClick: c.addSampleData }}
        />
      ) : null}

      {/* ✅ NEW: Empty state (앱은 있는데 오늘 활동/할일 상태 기반) */}
      {c.apps.length > 0 && c.todayEmptyState ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{c.todayEmptyState.title}</div>
              <div className="mt-1 text-sm text-zinc-400 leading-relaxed">{c.todayEmptyState.body}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => c.setQuickOpen(true)}
                className="px-3 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 text-sm"
              >
                ➕ 지금 추가
              </button>
              <button
                onClick={c.goToAddForm}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
              >
                전체 폼
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Focus + KPI */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">오늘 할 일</h2>
            <p className="text-sm text-zinc-400 mt-1">기준: {c.todayWindowDays}일 (REJECTED/WITHDRAWN/ARCHIVED 제외)</p>

            {/* ✅ NEW: streak + score */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
                <span className="text-zinc-400">🔥 Streak</span>{" "}
                <span className="font-semibold text-zinc-100">{c.todayMeta?.streak ?? 0}</span>
                <span className="text-zinc-400">일</span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
                <span className="text-zinc-400">📊 오늘 점수</span>{" "}
                <span className="font-semibold text-zinc-100">{c.todayMeta?.scoreToday ?? 0}</span>
              </div>
              {!c.todayMeta?.hasActivityToday ? (
                <div className="text-sm text-zinc-500">오늘 하나만 처리해도 streak가 이어져요.</div>
              ) : (
                <div className="text-sm text-zinc-500">좋아요. 오늘도 기록이 쌓였어요.</div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">Active</div>
                <div className="mt-1 text-lg font-semibold">{c.kpi.activeCount}</div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">이번 주 마감</div>
                <div className="mt-1 text-lg font-semibold">{c.kpi.weekDeadlineCount}</div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">이번 주 팔로업</div>
                <div className="mt-1 text-lg font-semibold">{c.kpi.weekFollowupCount}</div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">7일 내</div>
                <div className="mt-1 text-sm text-zinc-200">
                  마감 <span className="font-semibold">{c.kpi.due7}</span> · 팔로업{" "}
                  <span className="font-semibold">{c.kpi.followup7}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-zinc-400">
              이번 주({formatDateOnly(c.weekData.start.toISOString())} ~ {formatDateOnly(c.weekData.end.toISOString())}) 요약을
              복사해서 메모/카톡/노션에 붙여넣을 수 있어요.
            </div>
          </div>

          <div className="flex flex-col lg:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => c.setTodayWindowDays(3)}
                className={[
                  "px-3 py-2 rounded-lg text-sm border",
                  c.todayWindowDays === 3
                    ? "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
                    : "bg-zinc-900/40 text-zinc-100 border border-zinc-800 hover:bg-zinc-800",
                ].join(" ")}
              >
                3일
              </button>
              <button
                onClick={() => c.setTodayWindowDays(7)}
                className={[
                  "px-3 py-2 rounded-lg text-sm border",
                  c.todayWindowDays === 7
                    ? "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40"
                    : "bg-zinc-900/40 text-zinc-100 border-zinc-800 hover:bg-zinc-800",
                ].join(" ")}
              >
                7일
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                ref={c.quickAddBtnRef}
                onClick={() => c.setQuickOpen((v) => !v)}
                className="px-3 py-2 rounded-lg text-sm border bg-zinc-900/40 text-zinc-100 border-zinc-800 hover:bg-zinc-800"
                title="Today에서 바로 추가 (단축키: N)"
              >
                ➕ 빠른 추가
              </button>

              <button
                onClick={c.copyWeeklySummary}
                className="px-3 py-2 rounded-lg border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 text-sm"
              >
                이번 주 요약
              </button>

              <button onClick={c.copyWeeklyOneLine} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">
                한 줄 요약
              </button>
            </div>

            <div className="text-sm text-zinc-400">
              총 <span className="text-zinc-100 font-semibold">{c.apps.length}</span>개
            </div>
          </div>
        </div>

        {c.quickOpen ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">빠른 추가</div>
                <div className="mt-1 text-xs text-zinc-500">
                  회사/직무만 빠르게 저장하고, 디테일은 카드 클릭 후 오른쪽 패널에서 채워도 돼요.
                </div>
              </div>
              <button
                onClick={c.goToAddForm}
                className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm"
                title="아래 전체 폼으로 이동"
              >
                전체 폼으로
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <input
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                placeholder="회사명 (필수)"
                value={c.quickCompany}
                onChange={(e) => c.setQuickCompany(e.target.value)}
                disabled={c.quickBusy}
              />
              <input
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                placeholder="직무/포지션 (필수)"
                value={c.quickRole}
                onChange={(e) => c.setQuickRole(e.target.value)}
                disabled={c.quickBusy}
              />
              <input
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
                placeholder="URL (선택)"
                value={c.quickUrl}
                onChange={(e) => c.setQuickUrl(e.target.value)}
                disabled={c.quickBusy}
              />
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={c.addQuick}
                disabled={c.quickBusy}
                className="px-4 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50"
              >
                {c.quickBusy ? "추가 중…" : "추가"}
              </button>

              <button onClick={() => c.setQuickOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">
                닫기
              </button>

              <button
                onClick={c.addSampleData}
                className="px-4 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm"
                title="샘플 데이터 추가"
              >
                샘플 추가
              </button>
            </div>
          </div>
        ) : null}

        {c.showOnboarding ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">처음이신가요?</div>
                <div className="mt-1 text-sm text-zinc-400 leading-relaxed">
                  1) <span className="text-zinc-200 font-medium">빠른 추가(N)</span>로 회사/직무만 저장하고
                  <br />
                  2) 카드 클릭 → 오른쪽 <span className="text-zinc-200 font-medium">상세 패널</span>에서 마감/팔로업/Next를 채우면
                  <br />
                  3) Today에 자동으로 정리돼요.
                </div>
              </div>

              <button onClick={c.dismissOnboarding} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">
                닫기
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ✅ UPDATED: Focus Top (FREE=1 / PRO=3) — Controller의 todayFocusVisible 사용 */}
      <CollapsibleSection<Application>
        title={`🎯 Today Focus Top ${focusLimit}`}
        subtitle={isPro ? "오늘 처리할 핵심 3개만 보여줘요." : "FREE는 1개만 보여줘요. (Supporter는 3개)"}
        items={focusVisible}
        defaultVisibleCount={focusLimit}
        emptyText="오늘 집중할 항목이 아직 없어요. 마감/팔로업/Next Action을 넣어보세요."
        renderItem={(a) => (
          <AppCard
            key={`focus-${a.id}`}
            a={a}
            pinned={c.pinnedSet.has(a.id)}
            busy={c.busyId === a.id}
            contextLabel="Focus"
            onOpenDetails={c.openDetails}
            onDone={c.markDone}
            onPostpone={c.postponeFollowup}
            onStageChange={c.updateStage}
            onDelete={c.scheduleDelete}
            onTogglePin={c.togglePin}
          />
        )}
      />

      {/* ✅ FREE인데 focus가 더 있으면 소프트 안내 (막지 않음) */}
      {!isPro && hasMoreFocus ? (
        <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/15 p-4 text-sm text-zinc-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-emerald-200">💚 Supporter는 Today Focus를 최대 3개까지 한 번에 볼 수 있어요</div>
              <div className="mt-1 text-sm text-zinc-400">지금은 상위 1개만 보여드렸어요. 더 많은 Focus는 Supporter로 확장됩니다.</div>
            </div>
            <button
              type="button"
              onClick={() => c.setPaywallOpen(true)}
              className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition"
            >
              Supporter 보기
            </button>
          </div>
        </div>
      ) : null}

     {/* Action Queue (가중치 우선순위) */}
<section className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
  <div className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">⚡ Action Queue</h2>
          <span className="text-sm text-zinc-400">{c.actionQueue.length}개</span>
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          마감 + 팔로업 + Stage 가중치 기반 자동 정렬(핀 우선). “오늘 뭐하지?”를 바로 해결해요.
        </div>
      </div>

      <div className="flex items-center gap-2">
        {c.queueHasMore ? (
          <button
            onClick={() => c.setQueueShowAll((v) => !v)}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            {c.queueShowAll ? "Top 보기" : "전체 보기"}
          </button>
        ) : null}
      </div>
    </div>

    {c.actionQueue.length === 0 ? (
      <div className="mt-4 text-sm text-zinc-500">
        아직 큐에 올라올 항목이 없어요. deadline/followup/next_action 중 하나를 넣어보세요.
      </div>
    ) : (
      <div className="mt-4 space-y-3">
        {c.queueVisible.map((a) => (
          <div
            key={`queue-${a.id}`}
            className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
          >
            {/* ✅ 모바일: 세로 스택 / PC: 좌(내용) 우(버튼) */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <button
                onClick={() => c.openDetails(a.id)}
                className="text-left flex-1 min-w-0"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {c.pinnedSet.has(a.id) ? (
                    <span className="text-xs px-2 py-1 rounded-full border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-semibold whitespace-nowrap">
                      📌 Focus
                    </span>
                  ) : null}

                  <div className="font-semibold truncate break-keep min-w-0">
                    {a.company}{" "}
                    <span className="text-zinc-400 font-normal">/</span>{" "}
                    {a.role}
                  </div>

                  <span
                    className={[
                      "text-xs px-2 py-1 rounded-full whitespace-nowrap",
                      stageBadgeClass(a.stage),
                    ].join(" ")}
                  >
                    {stageLabel(a.stage)}
                  </span>
                </div>

                <div className="mt-2 text-xs text-zinc-500">{priorityHint(a)}</div>

                {a.next_action?.trim() ? (
                  <div className="mt-2 text-sm text-zinc-300 line-clamp-1 min-w-0 break-keep">
                    <span className="text-zinc-400">Next:</span>{" "}
                    {a.next_action.trim()}
                  </div>
                ) : null}
              </button>

              {/* ✅ 버튼 영역: 모바일은 아래로 내려가고 왼쪽 정렬 / PC는 오른쪽 정렬 */}
              <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end w-full lg:w-auto">
                <button
                  onClick={() => c.togglePin(a.id)}
                  disabled={c.busyId === a.id}
                  className={[
                    "h-10 lg:h-9 px-3 rounded-xl text-sm disabled:opacity-50",
                    c.pinnedSet.has(a.id)
                      ? "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40"
                      : "bg-zinc-800 hover:bg-zinc-700",
                  ].join(" ")}
                  title={c.pinnedSet.has(a.id) ? "Focus 핀 해제" : "Focus에 핀"}
                >
                  📌
                </button>

                <button
                  onClick={() => c.markDone(a.id)}
                  disabled={c.busyId === a.id}
                  className="h-10 lg:h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
                  title="완료(next/followup 비움)"
                >
                  ✅
                </button>

                <details className="relative">
                  <summary
                    className="list-none cursor-pointer h-10 lg:h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
                    title="팔로업 미루기"
                  >
                    ⏩
                  </summary>
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl p-1 z-10">
                    <button
                      onClick={() => c.postponeFollowup(a.id, 3)}
                      disabled={c.busyId === a.id}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-sm disabled:opacity-50"
                    >
                      +3일
                    </button>
                    <button
                      onClick={() => c.postponeFollowup(a.id, 7)}
                      disabled={c.busyId === a.id}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-sm disabled:opacity-50"
                    >
                      +7일
                    </button>
                  </div>
                </details>

                <details className="relative">
                  <summary
                    className="list-none cursor-pointer h-10 lg:h-9 px-3 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm"
                    aria-label="더보기"
                  >
                    ⋯
                  </summary>

                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl p-2 z-10">
                    <div className="text-xs text-zinc-500 px-2 pb-2">빠른 변경</div>

                    <div className="px-2 pb-2">
                      <label className="text-xs text-zinc-500">단계</label>
                      <select
                        className="mt-1 w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                        value={a.stage}
                        disabled={c.busyId === a.id}
                        onChange={(e) => c.updateStage(a.id, e.target.value as any)}
                      >
                        {STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-zinc-800 pt-2">
                      <button
                        onClick={() => c.scheduleDelete(a.id)}
                        disabled={c.busyId === a.id}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/40 text-sm text-red-200 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</section>

      {/* 기존 Today 섹션들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollapsibleSection<Application>
          title={`⏰ ${c.todayWindowDays}일 내 마감`}
          subtitle="Top 3만 먼저 보여주고, 필요하면 전체 보기로 확장하세요."
          items={c.todayData.dueSoon}
          defaultVisibleCount={3}
          renderItem={(a) => (
            <AppCard
              key={a.id}
              a={a}
              pinned={c.pinnedSet.has(a.id)}
              busy={c.busyId === a.id}
              contextLabel="Today"
              showEventBadge
              eventType="DEADLINE"
              onOpenDetails={c.openDetails}
              onDone={c.markDone}
              onPostpone={c.postponeFollowup}
              onStageChange={c.updateStage}
              onDelete={c.scheduleDelete}
              onTogglePin={c.togglePin}
              extraActions={
                <button
                  onClick={() => c.applySubmittedFromDeadline(a.id)}
                  disabled={c.busyId === a.id}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 text-sm font-medium disabled:opacity-50"
                >
                  ✅ 지원 완료(마감 제거)
                </button>
              }
            />
          )}
        />

        <CollapsibleSection<Application>
          title={`📩 ${c.todayWindowDays}일 내 팔로업`}
          subtitle="미루기/완료만 빠르게, 디테일은 패널에서 관리."
          items={c.todayData.followupSoon}
          defaultVisibleCount={3}
          renderItem={(a) => (
            <AppCard
              key={a.id}
              a={a}
              pinned={c.pinnedSet.has(a.id)}
              busy={c.busyId === a.id}
              contextLabel="Today"
              showEventBadge
              eventType="FOLLOWUP"
              onOpenDetails={c.openDetails}
              onDone={c.markDone}
              onPostpone={c.postponeFollowup}
              onStageChange={c.updateStage}
              onDelete={c.scheduleDelete}
              onTogglePin={c.togglePin}
              extraActions={
                <button
                  onClick={() => c.followupDoneOnly(a.id)}
                  disabled={c.busyId === a.id}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
                >
                  📩 팔로업 완료(followup만)
                </button>
              }
            />
          )}
        />
      </div>

      <CollapsibleSection<Application>
        title="📝 next_action만 있는 항목"
        subtitle="기본은 접어두고, 여유 있을 때 확인하는 리스트."
        items={c.todayData.actionOnly}
        defaultOpen={false}
        defaultVisibleCount={5}
        renderItem={(a) => (
          <AppCard
            key={a.id}
            a={a}
            pinned={c.pinnedSet.has(a.id)}
            busy={c.busyId === a.id}
            contextLabel="Next"
            onOpenDetails={c.openDetails}
            onDone={c.markDone}
            onPostpone={c.postponeFollowup}
            onStageChange={c.updateStage}
            onDelete={c.scheduleDelete}
            onTogglePin={c.togglePin}
          />
        )}
      />
    </section>
  );
}