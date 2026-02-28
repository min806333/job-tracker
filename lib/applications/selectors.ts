// lib/applications/selectors.ts
import { Application, CalendarEventType, Stage, STAGES } from "./types";

// ===== UI label helpers =====
export function stageLabel(stage: Stage) {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function stageBadgeClass(stage: Stage) {
  switch (stage) {
    case "SAVED":
      return "bg-zinc-800 text-zinc-100";
    case "APPLYING":
      return "bg-blue-900/60 text-blue-200";
    case "APPLIED":
      return "bg-sky-900/60 text-sky-200";
    case "TEST":
      return "bg-purple-900/60 text-purple-200";
    case "INTERVIEW":
      return "bg-amber-900/60 text-amber-200";
    case "OFFER":
      return "bg-emerald-900/60 text-emerald-200";
    case "REJECTED":
      return "bg-red-900/60 text-red-200";
    case "WITHDRAWN":
      return "bg-orange-900/60 text-orange-200";
    case "ARCHIVED":
      return "bg-zinc-700 text-zinc-100";
    default:
      return "bg-zinc-800 text-zinc-100";
  }
}

export function eventBadgeClass(type: CalendarEventType) {
  return type === "DEADLINE"
    ? "bg-red-900/60 text-red-200"
    : "bg-sky-900/60 text-sky-200";
}

// ===== Date helpers =====
export function dateInputToISOEndOfDay(dateStr: string) {
  const d = new Date(`${dateStr}T23:59:59`);
  return d.toISOString();
}

export function dateKeyToISOMorning(dateStr: string, hh = 9, mm = 0) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = pad(hh);
  const m = pad(mm);
  const d = new Date(`${dateStr}T${h}:${m}:00`);
  return d.toISOString();
}

export function isoToDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function isoToDateTimeLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function dateTimeLocalToISO(value: string) {
  const v = value.trim();
  if (!v) return null;
  return new Date(v).toISOString();
}

export function formatDateOnly(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// D-day 계산(로컬 날짜 기준, 시간 무시)
export function calcDDay(deadlineISO: string) {
  const deadline = new Date(deadlineISO);
  const now = new Date();

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDeadline = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

  const diffMs = startDeadline.getTime() - startToday.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function ddayBadge(diffDays: number) {
  if (diffDays < 0)
    return { text: `D+${Math.abs(diffDays)}`, cls: "bg-zinc-700 text-zinc-100" };
  if (diffDays === 0) return { text: "D-day", cls: "bg-red-700 text-white" };
  if (diffDays <= 3) return { text: `D-${diffDays}`, cls: "bg-red-900/70 text-red-200" };
  if (diffDays <= 7) return { text: `D-${diffDays}`, cls: "bg-amber-900/70 text-amber-200" };
  return { text: `D-${diffDays}`, cls: "bg-zinc-800 text-zinc-100" };
}

// ===== Today filtering helpers =====
export const EXCLUDED_TODAY_STAGES: Stage[] = ["REJECTED", "WITHDRAWN", "ARCHIVED"];
export function isActiveStage(stage: Stage) {
  return !EXCLUDED_TODAY_STAGES.includes(stage);
}

export function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function isWithinNextDays(iso: string | null, days: number) {
  if (!iso) return false;
  const target = new Date(iso);
  const now = new Date();
  const end = addDays(now, days);
  return target >= now && target <= end;
}

export function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfWeekSunday(d: Date) {
  const m = startOfWeekMonday(d);
  const s = new Date(m);
  s.setDate(s.getDate() + 6);
  s.setHours(23, 59, 59, 999);
  return s;
}

export function inRange(iso: string | null, start: Date, end: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function safeHttpUrl(url: string | null) {
  if (!url) return null;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return null;
  return u;
}

// ===== LocalStorage safe helpers =====
export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function safeLSGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function safeLSSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
export function safeLSRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// 작은 공용(필요하면 계속 추가)
export function nextPositionForStage(apps: Application[], stage: Stage) {
  return Math.max(0, ...apps.filter((a) => a.stage === stage).map((a) => a.position ?? 0)) + 1;
}
