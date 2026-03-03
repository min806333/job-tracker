"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DashboardController } from "../hooks/useDashboardController";

import SelectMenu from "../../common/SelectMenu";
import type { Filter, SortMode, Stage } from "../../../lib/applications/types";
import { STAGES } from "../../../lib/applications/types";
import {
  calcDDay,
  ddayBadge,
  formatDateOnly,
  safeHttpUrl,
  stageBadgeClass,
  stageLabel,
} from "../../../lib/applications/selectors";

/**
 * List 탭: 검색/필터/정렬 + 멀티선택 배치 액션 + (옵션) Stage 필터에서 POSITION 드래그 정렬
 * - 실제 데이터/핸들러는 DashboardController(c)에서 제공
 */

function BulkActionBar({ c, mobile }: { c: DashboardController; mobile?: boolean }) {
  const bulkStageOptions = useMemo(
    () => STAGES.map((s) => ({ value: s.value, label: s.label })),
    []
  );

  if (c.selectedIds.length === 0) return null;

  const allVisibleSelected = c.listVisibleIds.every((id) => c.selectedIds.includes(id));
  const someVisibleSelected = c.listVisibleIds.some((id) => c.selectedIds.includes(id));

  if (mobile) {
    return (
      <div
        className="fixed left-0 right-0 top-0 z-[60] border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sm:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 overflow-x-auto px-4">
          <div className="shrink-0 text-xs text-zinc-400">
            선택 <span className="font-semibold text-zinc-100">{c.selectedIds.length}</span>
          </div>
          <button
            onClick={() => c.batchMarkDone(c.selectedIds)}
            disabled={c.busyBatch}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-50"
            title="완료 처리"
          >
            ✓
          </button>
          <button
            onClick={() => c.batchPin(c.selectedIds)}
            disabled={c.busyBatch}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 disabled:opacity-50"
            title="핀 추가"
          >
            📌
          </button>
          <button
            onClick={() => c.batchPostpone(c.selectedIds, 3)}
            disabled={c.busyBatch}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 disabled:opacity-50"
            title="+3일"
          >
            →+3
          </button>
          <button
            onClick={() => c.batchPostpone(c.selectedIds, 7)}
            disabled={c.busyBatch}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 disabled:opacity-50"
            title="+7일"
          >
            →+7
          </button>
          <button
            onClick={() => c.batchDelete(c.selectedIds)}
            disabled={c.busyBatch}
            className="shrink-0 rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-1.5 text-xs text-red-200 disabled:opacity-50"
            title="삭제"
          >
            삭제
          </button>
          <button
            onClick={c.clearSelection}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100"
            title="선택 해제"
          >
            해제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-4 z-[40] hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur sm:block">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="text-sm text-zinc-300">
          선택됨: <span className="font-semibold text-white">{c.selectedIds.length}</span>건
          <span className="ml-2 text-xs text-zinc-500">(배치 처리 가능)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => c.batchMarkDone(c.selectedIds)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl  text-zinc-900 hover:bg-zinc-200 font-medium text-sm disabled:opacity-50"
          >
            ✅ 완료
          </button>

          <button
            onClick={() => c.batchPostpone(c.selectedIds, 3)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
          >
            ⏩ +3일
          </button>
          <button
            onClick={() => c.batchPostpone(c.selectedIds, 7)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
          >
            ⏩ +7일
          </button>

          <SelectMenu
            value={c.bulkStage}
            onChange={(value) => c.setBulkStage(value as Stage)}
            options={bulkStageOptions}
            buttonClassName="min-w-[132px] border-zinc-800 bg-zinc-950"
          />

          <button
            onClick={() => c.batchSetStage(c.selectedIds, c.bulkStage)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
          >
            단계 적용
          </button>

          <button
            onClick={() => c.batchArchive(c.selectedIds)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
          >
            보관(Archive)
          </button>

          <button
            onClick={() => c.batchPin(c.selectedIds)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
            title="Focus는 최대 3개"
          >
            📌 핀
          </button>

          <button
            onClick={() => c.batchUnpin(c.selectedIds)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
          >
            📌 해제
          </button>

          <button
            onClick={() => c.batchDelete(c.selectedIds)}
            disabled={c.busyBatch}
            className="px-3 py-2 rounded-xl bg-red-950/40 border border-red-900/40 text-red-200 hover:bg-red-950/60 text-sm disabled:opacity-50"
          >
            삭제
          </button>

          <button
            onClick={c.clearSelection}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            선택 해제
          </button>

          <div className="h-6 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() =>
              allVisibleSelected ? c.deselectAllVisible(c.listVisibleIds) : c.selectAllVisible(c.listVisibleIds)
            }
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
            disabled={!c.listVisibleIds.length}
          >
            {allVisibleSelected ? "현재 화면 선택 해제" : someVisibleSelected ? "현재 화면 모두 선택" : "현재 화면 모두 선택"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileBulkActionBarPortal({ c }: { c: DashboardController }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(<BulkActionBar c={c} mobile />, document.body);
}

export default function ListTab({ c }: { c: DashboardController }) {
  const visible = c.visibleListApps;

  const stageDragHint = useMemo(() => {
    if (!c.dragEnabled) return null;
    return c.stageFilterForDrag ? stageLabel(c.stageFilterForDrag) : null;
  }, [c.dragEnabled, c.stageFilterForDrag]);

  const filterOptions = useMemo(
    () => [
      { value: "ALL", label: "전체" },
      { value: "DUE_SOON", label: "마감 임박(7일)", disabled: c.sortMode === "POSITION" },
      ...STAGES.map((s) => ({ value: s.value, label: s.label })),
    ],
    [c.sortMode]
  );

  const sortOptions = useMemo(
    () =>
      [
        { value: "POSITION", label: "수동 정렬" },
        { value: "DEADLINE", label: "마감 임박 순" },
        { value: "CREATED_DESC", label: "최신 생성 순" },
      ] satisfies Array<{ value: SortMode; label: string }>,
    []
  );

  return (
    <section
      data-testid="list-tab-section"
      className={[
        "mt-6 space-y-4",
        c.selectedIds.length > 0 ? "pt-[calc(3.5rem+env(safe-area-inset-top))] sm:pt-0" : "",
      ].join(" ")}
    >
      <BulkActionBar c={c} />
      <MobileBulkActionBarPortal c={c} />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="text-sm text-zinc-400">
            총 <span className="text-zinc-100 font-semibold">{c.apps.length}</span>건
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <input
              ref={c.listSearchRef}
              className="w-full lg:w-72 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              placeholder="검색 (회사/직무)  /  단축키: /"
              value={c.query}
              onChange={(e) => c.setQuery(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">필터</span>
              <SelectMenu
                value={c.filter}
                options={filterOptions}
                onChange={(value) => {
                  c.setFilter(value as Filter);
                  c.clearSelection();
                }}
                buttonClassName="min-w-[148px] border-zinc-800 bg-zinc-950"
                buttonTestId="list-filter-button"
                menuTestId="list-filter-menu"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">정렬</span>
              <SelectMenu
                value={c.sortMode}
                options={sortOptions}
                onChange={(value) => c.setSortMode(value as SortMode)}
                buttonClassName="min-w-[140px] border-zinc-800 bg-zinc-950"
                buttonTestId="list-sort-button"
                menuTestId="list-sort-menu"
              />
            </div>

            <button
              onClick={c.goToAddForm}
              className="px-3 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium hover:bg-zinc-200 text-sm"
            >
              ➕ 카드 추가
            </button>
          </div>
        </div>

        {c.sortMode === "POSITION" && !c.dragEnabled ? (
          <div className="mt-3 text-xs text-zinc-500">
            수동 정렬(드래그)은 <span className="text-zinc-200">단계 필터</span>를 선택했을 때 활성화돼요.
          </div>
        ) : null}

        {c.dragEnabled ? (
          <div className="mt-3 text-xs text-zinc-500">
            드래그로 순서를 바꾸면 자동으로 저장돼요. (Stage:{" "}
            <span className="text-zinc-200">{stageDragHint ?? "-"}</span>)
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        c.apps.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-lg font-semibold">아직 등록된 지원이 없어요</div>
            <div className="mt-1 text-sm text-zinc-400">
              회사/직무만 먼저 추가하고, 필요한 옵션은 나중에 채워도 됩니다.
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={c.goToAddForm}
                className="px-4 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium hover:bg-emerald-950/400"
              >
                ➕ 첫 카드 추가
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-lg font-semibold">조건에 맞는 항목이 없어요</div>
            <div className="mt-1 text-sm text-zinc-400">검색/필터 조건 때문에 보이지 않을 수 있어요.</div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => c.setFilter("ALL")}
                className="px-4 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium hover:bg-emerald-950/40"
              >
                필터 초기화
              </button>
              <button
                onClick={() => c.setQuery("")}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
              >
                검색 지우기
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((a) => {
            const dday = a.deadline_at ? ddayBadge(calcDDay(a.deadline_at)) : null;
            const pinned = c.pinnedSet.has(a.id);

            return (
              <article
                key={a.id}
                draggable={c.dragEnabled}
                onDragStart={() => c.handleListDragStart(a.id)}
                onDragOver={(e) => {
                  if (!c.dragEnabled) return;
                  e.preventDefault();
                }}
                onDrop={() => c.handleListDrop(a.id)}
                className={[
                  "rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:bg-zinc-900/60 transition",
                  c.dragEnabled ? "cursor-move" : "cursor-pointer",
                  c.draggingId === a.id ? "ring-2 ring-white/40" : "",
                ].join(" ")}
                onClick={() => c.openDetails(a.id)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="checkbox"
                        checked={c.isSelected(a.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          c.toggleSelect(a.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-white"
                        title="선택"
                      />

                      {c.dragEnabled ? (
                        <span
                          className="text-zinc-500 text-xs px-2 py-1 rounded-full bg-zinc-950/40 border border-zinc-800"
                          title="드래그로 순서 변경"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⠿
                        </span>
                      ) : null}

                      {pinned ? (
                        <span className="text-xs px-2 py-1 rounded-full border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-semibold">
                          📌 Focus
                        </span>
                      ) : null}

                      <h3 className="text-lg font-semibold truncate">{a.company}</h3>

                      <span className={["text-xs px-2 py-1 rounded-full", stageBadgeClass(a.stage)].join(" ")}>
                        {stageLabel(a.stage)}
                      </span>

                      {dday ? (
                        <span className={["text-xs px-2 py-1 rounded-full", dday.cls].join(" ")}>
                          {dday.text}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-zinc-300 mt-1 truncate">{a.role}</p>

                    <div className="mt-2 text-xs text-zinc-500 leading-relaxed">
                      <div>마감: {formatDateOnly(a.deadline_at)}</div>
                      <div>팔로업: {formatDateOnly(a.followup_at)}</div>
                    </div>

                    {a.next_action?.trim() ? (
                      <div className="mt-2 text-sm text-zinc-400 line-clamp-1">
                        <span className="text-zinc-500">다음 행동:</span> {a.next_action.trim()}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        c.togglePin(a.id);
                      }}
                      className={[
                        "text-sm px-3 py-2 rounded-xl",
                        pinned ? "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200" : "bg-zinc-800 hover:bg-zinc-700",
                      ].join(" ")}
                      title="Focus 핀(최대 3개)"
                    >
                      {pinned ? "📌 해제" : "📌 핀"}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        c.scheduleDelete(a.id);
                      }}
                      disabled={c.busyId === a.id}
                      className="text-sm px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                      title="삭제 (되돌리기 가능)"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {safeHttpUrl(a.url) ? (
                  <a
                    href={safeHttpUrl(a.url) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-3 text-sm text-zinc-400 hover:text-zinc-200 break-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.url}
                  </a>
                ) : (
                  <div className="mt-3 text-sm text-zinc-600">URL 없음</div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
