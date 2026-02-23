"use client";

import React, { useMemo, useRef, useState } from "react";
import type { Application, Stage, CalendarEventType, CalendarDragPayload } from "../../../lib/applications/types";
import type { DashboardController } from "../hooks/useDashboardController";
import { calcDDay, ddayBadge } from "../../../lib/applications/selectors";
import { CollapsibleSection } from "../common/CollapsibleSection";
import { AppCard } from "../common/AppCard";

// ===== Calendar helpers =====
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function dateKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function clampToLocalDate(iso: string) {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isTodayKey(key: string) {
  return key === dateKeyLocal(new Date());
}

// ===== Calendar View (월간 업그레이드 + 드래그앤드롭 + day panel 섹션 분리) =====
type CalendarEvent = {
  type: CalendarEventType;
  app: Application;
  dateKey: string; // YYYY-MM-DD (local)
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
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKeyLocal(new Date()));
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // ✅ drop 직후 click 이벤트가 같이 튀는 브라우저가 있어서 자동추가 방지
  const suppressAutoAddRef = useRef(false);

  const events = useMemo(() => {
    const out: CalendarEvent[] = [];
    for (const a of apps) {
      if (a.deadline_at) {
        const d = clampToLocalDate(a.deadline_at);
        out.push({ type: "DEADLINE", app: a, dateKey: dateKeyLocal(d) });
      }
      if (a.followup_at) {
        const d = clampToLocalDate(a.followup_at);
        out.push({ type: "FOLLOWUP", app: a, dateKey: dateKeyLocal(d) });
      }
    }
    return out;
  }, [apps]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = m.get(e.dateKey) ?? [];
      arr.push(e);
      m.set(e.dateKey, arr);
    }

    // 정렬(마감 먼저, then 팔로업, then pinned, then 회사명)
    for (const [k, arr] of m.entries()) {
      arr.sort((x, y) => {
        if (x.type !== y.type) return x.type === "DEADLINE" ? -1 : 1;
        const xp = pinnedSet.has(x.app.id) ? 1 : 0;
        const yp = pinnedSet.has(y.app.id) ? 1 : 0;
        if (xp !== yp) return yp - xp;
        return `${x.app.company} ${x.app.role}`.localeCompare(`${y.app.company} ${y.app.role}`);
      });
      m.set(k, arr);
    }
    return m;
  }, [events, pinnedSet]);

  const monthLabel = useMemo(() => {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  }, [cursor]);

  const gridDays = useMemo(() => {
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);

    // 월요일 시작
    const start = new Date(s);
    const day = start.getDay(); // 0 Sun
    const diffToMon = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMon);

    // 일요일 끝
    const end = new Date(e);
    const endDay = end.getDay();
    const diffToSun = endDay === 0 ? 0 : 7 - endDay;
    end.setDate(end.getDate() + diffToSun);

    const days: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [cursor]);

  const selectedEvents = useMemo(
    () => eventsByDay.get(selectedDateKey) ?? [],
    [eventsByDay, selectedDateKey]
  );

  const selectedDeadlines = useMemo(
    () => selectedEvents.filter((e) => e.type === "DEADLINE").map((e) => e.app),
    [selectedEvents]
  );

  const selectedFollowups = useMemo(
    () => selectedEvents.filter((e) => e.type === "FOLLOWUP").map((e) => e.app),
    [selectedEvents]
  );

  function onDragStart(e: React.DragEvent, payload: CalendarDragPayload) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  }

  function onDropDay(e: React.DragEvent, key: string) {
    e.preventDefault();
    setDragOverKey(null);

    // ✅ drop 직후 click 튐 방지
    suppressAutoAddRef.current = true;
    window.setTimeout(() => {
      suppressAutoAddRef.current = false;
    }, 180);

    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    let payload: CalendarDragPayload | null = null;
    try {
      payload = JSON.parse(raw) as CalendarDragPayload;
    } catch {
      payload = null;
    }
    if (!payload?.appId || !payload.type) return;

    onMoveEventDate(payload.appId, payload.type, key);
  }

  return (
    <section className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6">
      {/* Calendar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">Calendar</div>
            <div className="text-lg font-semibold">{monthLabel}</div>
            <div className="mt-1 text-xs text-zinc-500">
              팁: 이벤트(마감/팔로업) 칩을 <span className="text-zinc-200">드래그</span>해서 날짜를 옮길 수 있어요.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              ←
            </button>
            <button
              onClick={() => {
                setCursor(new Date());
                setSelectedDateKey(dateKeyLocal(new Date()));
              }}
              className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm"
            >
              오늘
            </button>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-zinc-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
            <div key={w} className="px-2">
              {w}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {gridDays.map((d) => {
            const key = dateKeyLocal(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isSelected = key === selectedDateKey;
            const isToday = isTodayKey(key);

            const dayEvents = eventsByDay.get(key) ?? [];
            const deadlineEvents = dayEvents.filter((x) => x.type === "DEADLINE");
            const followupEvents = dayEvents.filter((x) => x.type === "FOLLOWUP");

            const chips = dayEvents.slice(0, 2);
            const overflow = Math.max(0, dayEvents.length - chips.length);

            const dropActive = dragOverKey === key;

            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedDateKey(key);

                  // ✅ 빈 날짜 클릭 → 그날 추가(바로)
                  if (dayEvents.length === 0 && !suppressAutoAddRef.current) {
                    onQuickAddForDate(key);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault(); // ✅ drop 활성화
                  setDragOverKey(key);
                }}
                onDragLeave={() => setDragOverKey(null)}
                onDrop={(e) => onDropDay(e, key)}
                className={[
                  "rounded-xl border px-2 py-2 text-left min-h-[100px] transition relative",
                  isSelected
                    ? "border-white border border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
                    : "border-zinc-800 bg-zinc-950/30 hover:bg-zinc-950/50",
                  inMonth ? "" : "opacity-60",
                  dropActive ? "ring-2 ring-white/50" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={[
                      "text-sm font-semibold",
                      isSelected ? "text-zinc-900" : "text-zinc-100",
                    ].join(" ")}
                  >
                    {d.getDate()}
                    {isToday ? (
                      <span
                        className={[
                          "ml-2 text-[10px] px-2 py-1 rounded-full",
                          isSelected ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 text-zinc-200",
                        ].join(" ")}
                      >
                        today
                      </span>
                    ) : null}
                  </div>

                  {dayEvents.length > 0 ? (
                    <div className={["text-[11px]", isSelected ? "text-zinc-700" : "text-zinc-500"].join(" ")}>
                      {dayEvents.length}
                    </div>
                  ) : null}
                </div>

                {/* dots */}
                <div className="mt-2 flex items-center gap-1">
                  {deadlineEvents.length > 0 ? (
                    <span
                      className={[
                        "inline-flex items-center justify-center h-2 w-2 rounded-full",
                        isSelected ? "bg-red-600" : "bg-red-700",
                      ].join(" ")}
                      title={`마감 ${deadlineEvents.length}`}
                    />
                  ) : null}
                  {followupEvents.length > 0 ? (
                    <span
                      className={[
                        "inline-flex items-center justify-center h-2 w-2 rounded-full",
                        isSelected ? "bg-sky-600" : "bg-sky-700",
                      ].join(" ")}
                      title={`팔로업 ${followupEvents.length}`}
                    />
                  ) : null}
                </div>

                {/* chips */}
                <div className="mt-2 space-y-1">
                  {chips.map((ev) => {
                    const isPinned = pinnedSet.has(ev.app.id);
                    const tone =
                      ev.type === "DEADLINE"
                        ? isSelected
                          ? "bg-red-600/80 text-white"
                          : "bg-red-950/40 text-red-200 border border-red-900/30"
                        : isSelected
                        ? "bg-sky-600/80 text-white"
                        : "bg-sky-950/40 text-sky-200 border border-sky-900/30";

                    return (
                      <div
                        key={`${ev.type}-${ev.app.id}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, { type: ev.type, appId: ev.app.id })}
                        className={[
                          "text-[11px] px-2 py-1 rounded-lg truncate",
                          "cursor-grab active:cursor-grabbing",
                          tone,
                        ].join(" ")}
                        title="드래그해서 날짜 이동"
                      >
                        {isPinned ? "📌 " : ""}
                        {ev.type === "DEADLINE" ? "마감" : "팔로업"} · {ev.app.company}
                      </div>
                    );
                  })}

                  {overflow > 0 ? (
                    <div className={["text-[11px]", isSelected ? "text-zinc-700" : "text-zinc-500"].join(" ")}>
                      +{overflow} 더보기
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-700" /> deadline
          </span>
          <span className="ml-4 inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-700" /> followup
          </span>
        </div>
      </div>

      {/* Right: selected day list */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-zinc-400">선택한 날짜</div>
            <div className="text-lg font-semibold">{selectedDateKey}</div>
            <div className="mt-1 text-xs text-zinc-500">
              마감/팔로업을 <span className="text-zinc-200">Top 3</span>로 먼저 보여주고 더보기로 확장해요.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onQuickAddForDate(selectedDateKey)}
              className="px-3 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 text-sm font-medium"
              title="선택한 날짜로 새 카드 추가"
            >
              ➕ 추가
            </button>

            <button
              onClick={() => setSelectedDateKey(dateKeyLocal(new Date()))}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
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
            renderItem={(a) => (
              <AppCard
                key={`deadline-${a.id}`}
                a={a}
                variant="compact"
                pinned={pinnedSet.has(a.id)}
                busy={busyId === a.id}
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
                    onClick={() => onApplySubmittedFromDeadline(a.id)}
                    disabled={busyId === a.id}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 text-sm font-medium disabled:opacity-50"
                    title="지원 완료로 변경하고 마감일은 제거합니다(선택)"
                  >
                    ✅ 지원 완료(마감 제거)
                  </button>
                }
              />
            )}
          />

          <CollapsibleSection<Application>
            title="📩 팔로업"
            subtitle="그날 처리/미루기/완료를 빠르게"
            items={selectedFollowups}
            defaultVisibleCount={3}
            emptyText="이 날짜에 팔로업이 없어요."
            renderItem={(a) => (
              <AppCard
                key={`followup-${a.id}`}
                a={a}
                variant="compact"
                pinned={pinnedSet.has(a.id)}
                busy={busyId === a.id}
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
                      onClick={() => onFollowupDoneOnly(a.id)}
                      disabled={busyId === a.id}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
                      title="followup_at만 비웁니다 (Next는 유지)"
                    >
                      📩 팔로업 완료(followup만)
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onPostpone(a.id, 3)}
                        disabled={busyId === a.id}
                        className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
                      >
                        +3일
                      </button>
                      <button
                        onClick={() => onPostpone(a.id, 7)}
                        disabled={busyId === a.id}
                        className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
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

