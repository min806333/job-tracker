import React, { useMemo, useState } from "react";

import type { Application, CalendarEventType, Stage } from "../../../lib/applications/types";
import { STAGES } from "../../../lib/applications/types";
import {
  calcDDay,
  ddayBadge,
  eventBadgeClass,
  formatDateOnly,
  safeHttpUrl,
  stageBadgeClass,
  stageLabel,
} from "../../../lib/applications/selectors";
import { track } from "@/lib/analytics/track";
import { IconButton } from "@/components/common/IconButton";

type ReasonTone = "default" | "warning" | "danger" | "focus";
type ReasonBadge = {
  key: string;
  label: string;
  description: string;
  tone: ReasonTone;
};

function reasonToneClass(tone: ReasonTone) {
  if (tone === "danger") return "border-rose-500/20 bg-zinc-800/60 text-rose-200";
  if (tone === "warning") return "border-amber-500/20 bg-zinc-800/60 text-amber-200";
  if (tone === "focus") return "border-indigo-500/20 bg-zinc-800/60 text-indigo-200";
  return "border-zinc-700/70 bg-zinc-800/60 text-zinc-200";
}

function getReasonBadges(a: Application, pinned: boolean): {
  badges: ReasonBadge[];
  urgency: "default" | "warning" | "danger";
} {
  const badges: ReasonBadge[] = [];
  let urgency: "default" | "warning" | "danger" = "default";

  if (pinned) {
    badges.push({
      key: "focus",
      label: "오늘 집중(고정)",
      description: "직접 고정한 항목이라 상단에 우선 표시돼요.",
      tone: "focus",
    });
  }

  if (a.deadline_at) {
    const d = calcDDay(a.deadline_at);
    if (d < 0) {
      urgency = "danger";
      badges.push({
        key: "deadline_overdue",
        label: "마감 지남",
        description: `마감일이 ${Math.abs(d)}일 지나 우선 배치됐어요.`,
        tone: "danger",
      });
    } else if (d <= 2) {
      urgency = "warning";
      badges.push({
        key: "deadline_soon",
        label: "마감 임박",
        description: `마감이 ${d}일 남아 상단에 배치됐어요.`,
        tone: "warning",
      });
    }
  }

  if (a.followup_at) {
    const d = calcDDay(a.followup_at);
    if (d <= 0 && !badges.some((b) => b.key === "followup_due")) {
      if (urgency !== "danger") urgency = "warning";
      badges.push({
        key: "followup_due",
        label: "팔로업 필요",
        description: d < 0 ? `팔로업 예정일이 ${Math.abs(d)}일 지났어요.` : "팔로업 예정일이 오늘이라 우선 표시돼요.",
        tone: "warning",
      });
    }
  }

  if ((a.stage === "INTERVIEW" || a.stage === "TEST") && !badges.some((b) => b.key === "stage_priority")) {
    if (urgency === "default") urgency = "warning";
    badges.push({
      key: "stage_priority",
      label: "면접/테스트 단계",
      description: "결과 변동 가능성이 큰 단계라 우선 노출돼요.",
      tone: "default",
    });
  }

  return { badges: badges.slice(0, 2), urgency };
}

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
  const [expandedReasonKey, setExpandedReasonKey] = useState<string | null>(null);

  const deadlineBadge = a.deadline_at ? ddayBadge(calcDDay(a.deadline_at)) : null;
  const followupBadge = a.followup_at ? ddayBadge(calcDDay(a.followup_at)) : null;
  const { badges: reasonBadges, urgency } = useMemo(() => getReasonBadges(a, pinned), [a, pinned]);

  const topBadge = eventType === "DEADLINE" ? deadlineBadge : eventType === "FOLLOWUP" ? followupBadge : null;
  const compact = variant === "compact";
  const safeUrl = safeHttpUrl(a.url);

  const urgencyHoverBorderClass =
    urgency === "danger"
      ? "hover:border-rose-500/30"
      : urgency === "warning"
      ? "hover:border-amber-500/30"
      : "hover:border-zinc-700/40";

  const outerCls = [
    "rounded-xl border border-zinc-800/70 bg-zinc-950/55 hover:bg-zinc-950/70 transition duration-150",
    "cursor-pointer shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
    urgencyHoverBorderClass,
    compact ? "p-3" : "p-4",
  ].join(" ");

  const badgeBase = "whitespace-nowrap rounded-full px-2 py-1 text-xs";

  function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
  }

  function maybeTrackReasonTooltip(label: string) {
    const key = "evt_reason_badge_tooltip_shown";
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {}
    void track("reason_badge_tooltip_shown", { badge: label });
  }

  return (
    <div
      className={outerCls}
      onClick={() => onOpenDetails(a.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails(a.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {contextLabel ? (
              <span className={`${badgeBase} border border-zinc-800 bg-zinc-900/50 text-zinc-200`}>{contextLabel}</span>
            ) : null}

            <span className={[badgeBase, stageBadgeClass(a.stage)].join(" ")}>{stageLabel(a.stage)}</span>

            {showEventBadge && eventType ? (
              <span className={[badgeBase, eventBadgeClass(eventType)].join(" ")}>{eventType === "DEADLINE" ? "마감" : "팔로업"}</span>
            ) : null}

            {topBadge ? <span className={[badgeBase, topBadge.cls].join(" ")}>{topBadge.text}</span> : null}
          </div>

          <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5 text-zinc-100 sm:text-base">
            {a.company}
            <span className="mx-1 text-zinc-500">/</span>
            {a.role}
          </h3>

          <p className="mt-1 truncate text-xs text-zinc-400">
            Stage {stageLabel(a.stage)} · 마감 {formatDateOnly(a.deadline_at)} · 팔로업 {formatDateOnly(a.followup_at)}
          </p>

          {a.next_action?.trim() ? (
            <div className="mt-2 text-sm text-zinc-300">
              <span className="text-zinc-400">다음 행동:</span> <span className="line-clamp-1">{a.next_action.trim()}</span>
            </div>
          ) : null}

          {reasonBadges.length > 0 ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                {reasonBadges.map((badge) => {
                  const expanded = expandedReasonKey === badge.key;
                  return (
                    <button
                      key={badge.key}
                      type="button"
                      className={cx(
                        "rounded-full border px-2 py-1 text-xs whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                        reasonToneClass(badge.tone)
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedReasonKey((prev) => (prev === badge.key ? null : badge.key));
                        maybeTrackReasonTooltip(badge.label);
                      }}
                      aria-expanded={expanded}
                      aria-label={`${badge.label} 이유 보기`}
                    >
                      {badge.label}
                    </button>
                  );
                })}
              </div>

              {expandedReasonKey ? (
                <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300" onClick={(e) => e.stopPropagation()}>
                  {reasonBadges.find((b) => b.key === expandedReasonKey)?.description}
                </div>
              ) : null}
            </div>
          ) : null}

          {!compact && safeUrl ? (
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block min-w-0 break-words text-sm text-zinc-400 hover:text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            >
              {a.url}
            </a>
          ) : null}
        </div>

        <div className="w-full shrink-0 sm:w-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex min-w-max items-center gap-2 overflow-x-auto sm:justify-end">
            <IconButton
              onClick={() => onTogglePin(a.id)}
              disabled={busy}
              active={pinned}
              title={pinned ? "Focus 핀 해제" : "Focus에 핀"}
              aria-label={pinned ? "Focus 핀 해제" : "Focus 핀"}
              icon={
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 3h8l-2 6 3 3v2H7v-2l3-3-2-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 14v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              }
            />

            <IconButton
              onClick={() => onDone(a.id)}
              disabled={busy}
              title="완료(next/followup 비움)"
              aria-label="완료"
              icon={
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />

            <details className="relative">
              <summary
                className={cx(
                  "list-none cursor-pointer h-10 w-10 rounded-xl flex items-center justify-center bg-zinc-800/70 hover:bg-zinc-700 active:scale-95 transition duration-150",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                  "group-open:bg-indigo-600/20 group-open:ring-1 group-open:ring-indigo-500",
                  busy && "opacity-40 pointer-events-none"
                )}
                title="다음 액션 미루기"
                aria-label="다음 액션"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="m13 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => onPostpone(a.id, 3)}
                  disabled={busy}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-900 disabled:opacity-40"
                >
                  +3일
                </button>
                <button
                  type="button"
                  onClick={() => onPostpone(a.id, 7)}
                  disabled={busy}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-900 disabled:opacity-40"
                >
                  +7일
                </button>
              </div>
            </details>

            <details className="relative">
              <summary
                className={cx(
                  "list-none cursor-pointer h-10 w-10 rounded-xl flex items-center justify-center border border-zinc-800 bg-zinc-900/40 text-zinc-100 hover:bg-zinc-800",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
                  busy && "opacity-40 pointer-events-none"
                )}
                aria-label="더보기"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </summary>

              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
                <div className="px-2 pb-2 text-xs text-zinc-500">빠른 변경</div>

                <div className="px-2 pb-2">
                  <label className="text-xs text-zinc-500">단계</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
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
                    type="button"
                    onClick={() => onDelete(a.id)}
                    disabled={busy}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-950/40 disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {compact && safeUrl ? (
        <a
          href={safeUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block min-w-0 break-words text-sm text-zinc-400 hover:text-zinc-200"
          onClick={(e) => e.stopPropagation()}
        >
          {a.url}
        </a>
      ) : null}
    </div>
  );
}

