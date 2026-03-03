"use client";

import React, { useMemo, useRef, useState } from "react";
import type { Application, CalendarDragPayload, CalendarEventType, Stage } from "../../../lib/applications/types";
import type { DashboardController } from "../hooks/useDashboardController";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { AppCard } from "../common/AppCard";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toLocalDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toLocalDateOnly(iso: string) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isToday(dateKey: string) {
  return dateKey === toLocalDateKey(new Date());
}

type CalendarEvent = {
  type: CalendarEventType;
  app: Application;
  dateKey: string;
};

function CalendarView({
  apps,
  pinnedSet,
  busyId,
  onOpenDetails,
  onDone,
  onPostpone,
  onStageChange,
  onDelete,
  onTogglePin,
  onMoveEventDate,
  onApplySubmittedFromDeadline,
  onFollowupDoneOnly,
  onQuickAddForDate,
}: {
  apps: Application[];
  pinnedSet: Set<string>;
  busyId: string | null;
  onOpenDetails: (id: string) => void;
  onDone: (id: string) => void;
  onPostpone: (id: string, days: 3 | 7) => void;
  onStageChange: (id: string, stage: Stage) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onMoveEventDate: (appId: string, type: CalendarEventType, targetDateKey: string) => void;
  onApplySubmittedFromDeadline: (id: string) => void;
  onFollowupDoneOnly: (id: string) => void;
  onQuickAddForDate: (dateKey: string) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toLocalDateKey(new Date()));
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const suppressAutoAddRef = useRef(false);

  const events = useMemo(() => {
    const out: CalendarEvent[] = [];

    for (const app of apps) {
      if (app.deadline_at) {
        out.push({
          type: "DEADLINE",
          app,
          dateKey: toLocalDateKey(toLocalDateOnly(app.deadline_at)),
        });
      }

      if (app.followup_at) {
        out.push({
          type: "FOLLOWUP",
          app,
          dateKey: toLocalDateKey(toLocalDateOnly(app.followup_at)),
        });
      }
    }

    return out;
  }, [apps]);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const arr = grouped.get(event.dateKey) ?? [];
      arr.push(event);
      grouped.set(event.dateKey, arr);
    }

    for (const [key, arr] of grouped.entries()) {
      arr.sort((a, b) => {
        if (a.type !== b.type) return a.type === "DEADLINE" ? -1 : 1;

        const ap = pinnedSet.has(a.app.id) ? 1 : 0;
        const bp = pinnedSet.has(b.app.id) ? 1 : 0;
        if (ap !== bp) return bp - ap;

        return `${a.app.company} ${a.app.role}`.localeCompare(`${b.app.company} ${b.app.role}`);
      });

      grouped.set(key, arr);
    }

    return grouped;
  }, [events, pinnedSet]);

  const monthLabel = useMemo(() => {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  }, [cursor]);

  const gridDays = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);

    const start = new Date(monthStart);
    const startDay = start.getDay();
    const diffToMon = startDay === 0 ? -6 : 1 - startDay;
    start.setDate(start.getDate() + diffToMon);

    const end = new Date(monthEnd);
    const endDay = end.getDay();
    const diffToSun = endDay === 0 ? 0 : 7 - endDay;
    end.setDate(end.getDate() + diffToSun);

    const days: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [cursor]);

  const selectedEvents = useMemo(() => eventsByDay.get(selectedDateKey) ?? [], [eventsByDay, selectedDateKey]);

  const selectedDeadlines = useMemo(
    () => selectedEvents.filter((event) => event.type === "DEADLINE").map((event) => event.app),
    [selectedEvents]
  );

  const selectedFollowups = useMemo(
    () => selectedEvents.filter((event) => event.type === "FOLLOWUP").map((event) => event.app),
    [selectedEvents]
  );

  function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    setDragOverKey(null);

    suppressAutoAddRef.current = true;
    window.setTimeout(() => {
      suppressAutoAddRef.current = false;
    }, 180);

    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as CalendarDragPayload;
      if (!payload?.appId || !payload?.type) return;
      onMoveEventDate(payload.appId, payload.type, dateKey);
    } catch {
      // noop
    }
  }

  return (
    <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_440px]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">캘린더</div>
            <div className="text-lg font-semibold">{monthLabel}</div>
            <div className="mt-1 text-xs text-zinc-500">
              이벤트(마감/팔로업) 카드를 <span className="text-zinc-200">드래그</span>해서 날짜를 옮길 수 있어요.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => {
                setCursor(new Date());
                setSelectedDateKey(toLocalDateKey(new Date()));
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-800"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
            >
              다음
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-zinc-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
            <div key={w} className="px-1 sm:px-2">
              {w}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {gridDays.map((day) => {
            const key = toLocalDateKey(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const selected = key === selectedDateKey;
            const today = isToday(key);
            const dayEvents = eventsByDay.get(key) ?? [];
            const deadlineCount = dayEvents.filter((event) => event.type === "DEADLINE").length;
            const followupCount = dayEvents.filter((event) => event.type === "FOLLOWUP").length;
            const dropActive = dragOverKey === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDateKey(key);
                  if (dayEvents.length === 0 && !suppressAutoAddRef.current) {
                    onQuickAddForDate(key);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverKey(key);
                }}
                onDragLeave={() => setDragOverKey(null)}
                onDrop={(e) => handleDrop(e, key)}
                className={[
                  "relative min-h-[64px] rounded-xl border px-2 py-2 text-left transition sm:min-h-[84px] lg:min-h-[100px]",
                  selected
                    ? "border border-emerald-900/40 bg-emerald-950/30"
                    : today
                      ? "border-emerald-500/20 bg-emerald-500/15 ring-1 ring-emerald-500/30"
                    : "border-zinc-800 bg-zinc-950/30 hover:bg-zinc-950/50",
                  inMonth ? "" : "opacity-60",
                  dropActive ? "ring-2 ring-white/50" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={[
                      "text-sm font-semibold",
                      selected || today ? "text-emerald-200" : "text-zinc-100",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </div>

                  {dayEvents.length > 0 ? (
                    <div className={["text-[11px]", selected ? "text-emerald-200/80" : "text-zinc-500"].join(" ")}>{dayEvents.length}</div>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center gap-1">
                  {deadlineCount > 0 ? <span className="h-2 w-2 rounded-full bg-rose-500" title={`마감 ${deadlineCount}`} /> : null}
                  {followupCount > 0 ? <span className="h-2 w-2 rounded-full bg-sky-500" title={`팔로업 ${followupCount}`} /> : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-xs text-zinc-400">마감</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span className="text-xs text-zinc-400">팔로업</span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm text-zinc-400">선택된 날짜</div>
            <div className="text-lg font-semibold">{selectedDateKey}</div>
            <div className="mt-1 text-xs text-zinc-500">
              선택한 날짜의 마감/팔로업 항목을 확인할 수 있어요.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuickAddForDate(selectedDateKey)}
              className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40"
              title="선택 날짜로 새 카드 추가"
            >
              + 추가
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateKey(toLocalDateKey(new Date()))}
              className="rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
            >
              오늘로
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <CollapsibleSection<Application>
            title="⏰ 마감"
            subtitle="지원 마감이 가까우면 우선 처리 추천"
            items={selectedDeadlines}
            defaultVisibleCount={3}
            emptyText="이 날짜에 마감이 없어요."
            renderItem={(app) => (
              <AppCard
                key={`deadline-${app.id}`}
                a={app}
                variant="compact"
                pinned={pinnedSet.has(app.id)}
                busy={busyId === app.id}
                contextLabel="Calendar"
                showEventBadge
                eventType="DEADLINE"
                onOpenDetails={onOpenDetails}
                onDone={onDone}
                onPostpone={onPostpone}
                onStageChange={onStageChange}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                extraActions={
                  <button
                    type="button"
                    onClick={() => onApplySubmittedFromDeadline(app.id)}
                    disabled={busyId === app.id}
                    className="w-full rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-50"
                    title="지원 완료로 변경하고 마감일을 제거합니다(선택)"
                  >
                    ✅ 지원 완료(마감 제거)
                  </button>
                }
              />
            )}
          />

          <CollapsibleSection<Application>
            title="📩 팔로업"
            subtitle="당일 팔로업을 빠르게 처리하거나 미룰 수 있어요"
            items={selectedFollowups}
            defaultVisibleCount={3}
            emptyText="이 날짜에 팔로업이 없어요."
            renderItem={(app) => (
              <AppCard
                key={`followup-${app.id}`}
                a={app}
                variant="compact"
                pinned={pinnedSet.has(app.id)}
                busy={busyId === app.id}
                contextLabel="Calendar"
                showEventBadge
                eventType="FOLLOWUP"
                onOpenDetails={onOpenDetails}
                onDone={onDone}
                onPostpone={onPostpone}
                onStageChange={onStageChange}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                extraActions={
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onFollowupDoneOnly(app.id)}
                      disabled={busyId === app.id}
                      className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50"
                      title="followup_at만 비웁니다 (Next는 유지)"
                    >
                      📩 팔로업 완료(followup만)
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onPostpone(app.id, 3)}
                        disabled={busyId === app.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
                      >
                        +3일
                      </button>
                      <button
                        type="button"
                        onClick={() => onPostpone(app.id, 7)}
                        disabled={busyId === app.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
                      >
                        +7일
                      </button>
                    </div>
                  </div>
                }
              />
            )}
          />
        </div>
      </div>
    </section>
  );
}

export default function CalendarTab({ c }: { c: DashboardController }) {
  return (
    <CalendarView
      apps={c.calendarApps}
      pinnedSet={c.pinnedSet}
      busyId={c.busyId}
      onOpenDetails={c.openDetails}
      onDone={c.markDone}
      onPostpone={c.postponeFollowup}
      onStageChange={c.updateStage}
      onDelete={c.scheduleDelete}
      onTogglePin={c.togglePin}
      onMoveEventDate={c.moveEventDate}
      onApplySubmittedFromDeadline={c.applySubmittedFromDeadline}
      onFollowupDoneOnly={c.followupDoneOnly}
      onQuickAddForDate={c.quickAddForDate}
    />
  );
}

