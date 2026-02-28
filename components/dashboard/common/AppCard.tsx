import React from "react";

import type { Application, Stage, CalendarEventType } from "../../../lib/applications/types";
import { STAGES } from "../../../lib/applications/types";
import {
  stageLabel,
  stageBadgeClass,
  eventBadgeClass,
  calcDDay,
  ddayBadge,
  formatDateOnly,
  safeHttpUrl,
} from "../../../lib/applications/selectors";

export function AppCard({
  a,
  contextLabel,
  showEventBadge,
  eventType,
  pinned,
  busy,
  onOpenDetails,
  onDone,
  onPostpone,
  onStageChange,
  onDelete,
  onTogglePin,
  extraActions,
  variant = "default",
}: {
  a: Application;
  contextLabel?: string;
  showEventBadge?: boolean;
  eventType?: CalendarEventType;
  pinned: boolean;
  busy: boolean;
  onOpenDetails: (id: string) => void;
  onDone: (id: string) => void;
  onPostpone: (id: string, days: 3 | 7) => void;
  onStageChange: (id: string, stage: Stage) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  extraActions?: React.ReactNode;
  variant?: "default" | "compact";
}) {
  const deadlineBadge = a.deadline_at ? ddayBadge(calcDDay(a.deadline_at)) : null;
  const followupBadge = a.followup_at ? ddayBadge(calcDDay(a.followup_at)) : null;

  const topBadge = eventType === "DEADLINE" ? deadlineBadge : eventType === "FOLLOWUP" ? followupBadge : null;
  const compact = variant === "compact";

  const outerCls = [
    "rounded-xl border border-zinc-800/70 bg-zinc-950/55 hover:bg-zinc-950/70 transition cursor-pointer shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
    compact ? "p-3" : "p-4",
  ].join(" ");

  const badgeBase = "text-xs px-2 py-1 rounded-full whitespace-nowrap";

  // ✅ 버튼은 모바일에서 아이콘만 / PC에서 텍스트 표시
  const actionBtnBase = compact
    ? "h-9 w-9 inline-flex items-center justify-center rounded-xl text-sm disabled:opacity-50"
    : "h-10 lg:h-9 px-3 inline-flex items-center justify-center rounded-xl text-sm disabled:opacity-50";

  function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
  }

  return (
    <div className={outerCls} onClick={() => onOpenDetails(a.id)} role="button" tabIndex={0}>
      {/* ✅ 모바일: 세로 스택 가능 / PC: 좌-우 */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        {/* left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {pinned ? (
              <span className="text-xs px-2 py-1 rounded-full border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-semibold whitespace-nowrap">
                📌 Focus
              </span>
            ) : null}

            {contextLabel ? (
              <span className={`${badgeBase} bg-zinc-900/50 border border-zinc-800 text-zinc-200`}>{contextLabel}</span>
            ) : null}

            {/* ✅ 제목: 모바일 세로찢김 방지 */}
            <div className="font-semibold min-w-0 flex-1 truncate">
              {a.company} <span className="text-zinc-400 font-normal">/</span> {a.role}
            </div>

            <span className={[badgeBase, stageBadgeClass(a.stage)].join(" ")}>{stageLabel(a.stage)}</span>

            {showEventBadge && eventType ? (
              <span className={[badgeBase, eventBadgeClass(eventType)].join(" ")}>
                {eventType === "DEADLINE" ? "마감" : "팔로업"}
              </span>
            ) : null}

            {topBadge ? <span className={[badgeBase, topBadge.cls].join(" ")}>{topBadge.text}</span> : null}
          </div>

          {a.next_action?.trim() ? (
            <div className="mt-2 text-sm text-zinc-300 min-w-0 whitespace-normal break-words">
              <span className="text-zinc-400">Next:</span> {a.next_action.trim()}
            </div>
          ) : null}

          {/* ✅ 날짜 메타: 모바일에서 자연스럽게 줄바꿈되게 */}
          {compact ? (
            <div className="mt-2 text-xs text-zinc-500 leading-relaxed min-w-0 whitespace-normal break-words">
              <div>마감: {formatDateOnly(a.deadline_at)}</div>
              <div>팔로업: {formatDateOnly(a.followup_at)}</div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-zinc-500 min-w-0 whitespace-normal break-words">
              <span className="inline-block mr-2">마감: {formatDateOnly(a.deadline_at)}</span>
              <span className="inline-block">팔로업: {formatDateOnly(a.followup_at)}</span>
            </div>
          )}
        </div>

        {/* actions */}
        <div
          className={cx(
            "flex items-center flex-wrap shrink-0",
            compact ? "gap-1" : "gap-2",
            // ✅ 모바일: 아래로 내려오면 왼쪽 정렬 / PC: 오른쪽 정렬
            "justify-start sm:justify-end w-full sm:w-auto"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onTogglePin(a.id)}
            disabled={busy}
            className={cx(
              actionBtnBase,
              pinned
                ? "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
            )}
            title={pinned ? "Focus 핀 해제" : "Focus에 핀"}
            aria-label={pinned ? "Focus 핀 해제" : "Focus 핀"}
          >
            {/* ✅ 모바일 텍스트 숨김 */}
            <span aria-hidden>📌</span>
            {!compact ? <span className="hidden lg:inline ml-2">{pinned ? "해제" : "핀"}</span> : null}
          </button>

          <button
            onClick={() => onDone(a.id)}
            disabled={busy}
            className={cx(actionBtnBase, "bg-zinc-800 hover:bg-zinc-700 text-zinc-100")}
            title="완료(next/followup 비움)"
            aria-label="완료"
          >
            <span aria-hidden>✅</span>
            {!compact ? <span className="hidden lg:inline ml-2">완료</span> : null}
          </button>

          <details className="relative">
            <summary
              className={cx(
                "list-none cursor-pointer",
                actionBtnBase,
                "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
              )}
              title="팔로업 미루기"
            >
              <span aria-hidden>⏩</span>
              {!compact ? <span className="hidden lg:inline ml-2">미루기</span> : null}
            </summary>
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl p-1 z-10">
              <button
                onClick={() => onPostpone(a.id, 3)}
                disabled={busy}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-sm disabled:opacity-50"
              >
                +3일
              </button>
              <button
                onClick={() => onPostpone(a.id, 7)}
                disabled={busy}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-900 text-sm disabled:opacity-50"
              >
                +7일
              </button>
            </div>
          </details>

          <details className="relative">
            <summary
              className={cx(
                "list-none cursor-pointer",
                actionBtnBase,
                "bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-zinc-100"
              )}
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
                  disabled={busy}
                  onChange={(e) => onStageChange(a.id, e.target.value as Stage)}
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {extraActions ? <div className="px-2 pb-2">{extraActions}</div> : null}

              <div className="border-t border-zinc-800 pt-2">
                <button
                  onClick={() => onDelete(a.id)}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/40 text-sm text-red-200 disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>

      {safeHttpUrl(a.url) ? (
        <a
          href={safeHttpUrl(a.url) ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="block mt-3 text-sm text-zinc-400 hover:text-zinc-200 min-w-0 whitespace-normal break-words"
          onClick={(e) => e.stopPropagation()}
        >
          {a.url}
        </a>
      ) : null}
    </div>
  );
}