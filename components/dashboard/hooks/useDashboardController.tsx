"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

import type {
  ActivityLog,
  ActivityType,
  Application,
  CalendarEventType,
  Filter,
  SortMode,
  Stage,
  UndoAction,
  ViewMode,
} from "../../../lib/applications/types";
import { LS, STAGES } from "../../../lib/applications/types";

import {
  EXCLUDED_TODAY_STAGES,
  addDays,
  calcDDay,
  dateInputToISOEndOfDay,
  dateKeyToISOMorning,
  dateTimeLocalToISO,
  ddayBadge,
  endOfWeekSunday,
  formatDateOnly,
  inRange,
  isActiveStage,
  isWithinNextDays,
  isoToDateInput,
  isoToDateTimeLocalInput,
  nextPositionForStage,
  safeHttpUrl,
  safeJsonParse,
  safeLSGet,
  safeLSRemove,
  safeLSSet,
  stageLabel,
  startOfWeekMonday,
  uid,
} from "../../../lib/applications/selectors";
import { priorityScore } from "../../../lib/applications/scoring";

import type { Toast } from "../common/ToastViewport";
import type { TutorialStep } from "../common/TutorialOverlay";

/** ===== SaaS Plan / Entitlements (MVP) ===== */
export type Plan = "free" | "pro" | "grace";
type Entitlements = {
  plan: Plan;
  maxApplications: number;
  maxFocusPins: number;
  canUseReports: boolean;
  canCalendarDrag: boolean;
  canExport: boolean;
};
type FeatureKey = "create_application" | "focus_pin" | "reports" | "calendar_drag" | "export";

export type UseDashboardControllerProps = {
  userId: string;
  userEmail: string;
  initialApplications: Application[];
};

export function useDashboardController({ userId, userEmail, initialApplications }: UseDashboardControllerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // ===== Profile menu drawer =====
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // ===== SaaS plan state =====
  const [plan, setPlan] = useState<Plan>("free");
  const [entitlements, setEntitlements] = useState<Entitlements>({
    plan: "free",
    maxApplications: 100, // ✅ FREE: Applications 최대 100
    maxFocusPins: 3, // (유지해도 됨. 단, FREE에서 핀 제한은 걸지 않음)
    canUseReports: false,
    canCalendarDrag: false,
    canExport: false, // ✅ FREE: CSV Export 제한
  });
  const [planLoading, setPlanLoading] = useState(false);

  // ===== Settings (profile_settings) =====
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  async function loadUserSettingsOnce() {
    if (!userId) return;
    if (settingsLoaded) return;

    const { data: s, error } = await supabase
      .from("profile_settings")
      .select("default_view_mode, today_window_days")
      .eq("user_id", userId)
      .single();

    if (!error && s) {
      const settings = s as {
        default_view_mode?: ViewMode | null;
        today_window_days?: number | null;
      };
      const mv = settings.default_view_mode ?? undefined;
      const tw = settings.today_window_days ?? undefined;

      if (mv) setViewMode(mv);
      if (tw === 7) setTodayWindowDays(7);
      else if (tw === 3) setTodayWindowDays(3);
    }

    setSettingsLoaded(true);
  }

  // ✅ userId 들어오면 1회 로드
  useEffect(() => {
    void loadUserSettingsOnce();
  }, [userId]);

  // ===== Core state =====
  const [apps, setApps] = useState(() => initialApplications ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyBatch, setBusyBatch] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("TODAY");
  const [todayWindowDays, setTodayWindowDays] = useState<3 | 7>(3);

  // ===== Drawer =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ===== Updates drawer (Paywall도 여기로 재활용) =====
  const [updatesOpen, setUpdatesOpen] = useState(false);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string>("");

  function openPaywall(reason?: string) {
    setPaywallReason(reason ?? "");
    setPaywallOpen(true);
  }

  function guard(feature: FeatureKey): boolean {
    // 로딩 중에는 막지 않고(UX), 서버/DB에서 최종 검증
    if (planLoading) return true;

    if (feature === "reports" && !entitlements.canUseReports) {
      openPaywall("리포트(고급)는 Pro에서 사용할 수 있어요.");
      return false;
    }
    if (feature === "calendar_drag" && !entitlements.canCalendarDrag) {
      openPaywall("캘린더 드래그 이동은 Pro에서 사용할 수 있어요.");
      return false;
    }
    if (feature === "export" && !entitlements.canExport) {
      openPaywall("내보내기(Export)는 Pro에서 사용할 수 있어요.");
      return false;
    }
    if (feature === "focus_pin") {
      // ✅ 진실: FREE에서 핀 자체는 막지 않음.
      // 제한은 TodayTab에서 "표시 개수(1 vs 3)"로만 처리한다.
      return true;
    }
    if (feature === "create_application") {
      const limit = entitlements.maxApplications ?? 80;
      if (apps.length >= limit) {
        openPaywall(`지원 항목은 최대 ${limit}개까지 저장할 수 있어요. (Pro로 확장 가능)`);
        return false;
      }
      return true;
    }
    return true;
  }

  function isPlanLimitErrorMessage(msg: string) {
    // DB trigger에서 raise exception 'PLAN_LIMIT: ...' 형태로 던짐
    return typeof msg === "string" && msg.includes("PLAN_LIMIT");
  }

  function planLimitFriendlyMessage(msg: string) {
    // 메시지 표준화(UX)
    if (!isPlanLimitErrorMessage(msg)) return msg;
    // 예: 'PLAN_LIMIT: applications max (80) exceeded'
    const m = msg.match(/\((\d+)\)/);
    const n = m?.[1] ? Number(m[1]) : null;
    const limitText = n ? `${n}` : "제한";
    return `무료 플랜 제한에 도달했어요. (최대 ${limitText}개) Pro로 업그레이드하면 계속 추가할 수 있어요.`;
  }

  async function loadPlanAndEntitlements() {
    if (!userId) return;
    setPlanLoading(true);

    try {
      // 1) profiles에서 plan 조회
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("plan, plan_status")
        .eq("id", userId)
        .single();

      // RLS/데이터 없을 경우 대비: 기본 free
      const rawPlan = prof?.plan as Plan | null | undefined;
      const p: Plan = rawPlan === "pro" ? "pro" : rawPlan === "grace" ? "grace" : "free";
      if (!profErr) setPlan(p);

      // 2) plan_limits에서 제한 조회
      const planForLimits: "free" | "pro" = p === "grace" ? "pro" : p;
      const { data: lim, error: limErr } = await supabase
        .from("plan_limits")
        .select("max_applications, max_focus_pins, enable_reports, enable_calendar_drag, enable_exports")
        .eq("plan", planForLimits)
        .single();

      if (!limErr && lim) {
        setEntitlements({
          plan: p,
          maxApplications:
            p === "grace" ? 100 : lim.max_applications ?? (planForLimits === "pro" ? 5000 : 100),
          maxFocusPins: lim.max_focus_pins ?? (planForLimits === "pro" ? 10 : 3),
          canUseReports: !!lim.enable_reports,
          canCalendarDrag: !!lim.enable_calendar_drag,
          canExport: !!lim.enable_exports,
        });
      } else {
        // fallback
        setEntitlements({
          plan: p,
          maxApplications: p === "grace" ? 100 : p === "pro" ? 5000 : 100,
          maxFocusPins: planForLimits === "pro" ? 10 : 3,
          canUseReports: planForLimits === "pro",
          canCalendarDrag: planForLimits === "pro",
          canExport: planForLimits === "pro",
        });
      }
    } finally {
      setPlanLoading(false);
    }
  }

  // plan load on mount
  useEffect(() => {
    void loadPlanAndEntitlements();
  }, [userId]);

  // ===== Tutorial =====
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // ===== Focus pins (localStorage) =====
  const [pins, setPins] = useState<string[]>([]);
  const pinnedSet = useMemo(() => new Set(pins), [pins]);

  // ===== Activity logs (localStorage) =====
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // ===== Refs (for tutorial spotlight) =====
  const quickAddBtnRef = useRef<HTMLButtonElement | null>(null);
  const calendarTabRef = useRef<HTMLButtonElement | null>(null);
  const reportTabRef = useRef<HTMLButtonElement | null>(null);
  const listTabRef = useRef<HTMLButtonElement | null>(null);
  const updatesBtnRef = useRef<HTMLButtonElement | null>(null);
  const addFormRef = useRef<HTMLDivElement | null>(null);
  const addOptionsRef = useRef<HTMLDetailsElement | null>(null);
  const companyInputRef = useRef<HTMLInputElement | null>(null);

  // ===== List controls =====
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("POSITION");
  const [query, setQuery] = useState("");
  const listSearchRef = useRef<HTMLInputElement | null>(null);

  // ===== List multiselect =====
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function isSelected(id: string) {
    return selectedIds.includes(id);
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function clearSelection() {
    setSelectedIds([]);
  }

  // ===== POSITION drag reorder (강화: stage 필터일 때만 허용) =====
  const dragEnabled = sortMode === "POSITION" && filter !== "ALL" && filter !== "DUE_SOON";
  const stageFilterForDrag = dragEnabled ? (filter as Stage) : null;
  const [positionOrderIds, setPositionOrderIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // ===== Quick Add (B안) =====
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickCompany, setQuickCompany] = useState("");
  const [quickRole, setQuickRole] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  // ===== Full Add form =====
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [followupLocal, setFollowupLocal] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [source, setSource] = useState("");

  // ===== Onboarding (only when empty) =====
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ===== Toast =====
  const [toasts, setToasts] = useState<Toast[]>([]);
  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }
  function pushToast(t: Omit<Toast, "id">) {
    const id = uid();
    const toast: Toast = { id, ...t };
    setToasts((prev) => [toast, ...prev].slice(0, 4));

    const duration = toast.durationMs ?? 2600;
    window.setTimeout(() => dismissToast(id), duration);
  }

  // ===== Undo stack (in-memory) =====
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const undoRef = useRef<UndoAction[]>([]);
  useEffect(() => {
    undoRef.current = undoStack;
  }, [undoStack]);

  async function performUndo(action: UndoAction) {
    // 먼저 제거해서 중복 실행 방지
    setUndoStack((prev) => prev.filter((a) => a.id !== action.id));
    try {
      await action.undo();
      pushToast({ tone: "success", message: "되돌렸어요 ✓" });
      pushLog("UNDO", `Undo: ${action.label}`);
    } catch (e: any) {
      pushToast({ tone: "error", message: "Undo 실패: " + (e?.message ?? "unknown") });
    }
  }

  async function undoLast() {
    const action = undoRef.current[0];
    if (!action) {
      pushToast({ tone: "default", message: "되돌릴 작업이 없어요." });
      return;
    }
    await performUndo(action);
  }

  // ===== Logs helpers =====
  function persistLogs(next: ActivityLog[]) {
    safeLSSet(LS.activityLogs, JSON.stringify(next));
  }

  function pushLog(type: ActivityType, message: string, appId?: string) {
    const entry: ActivityLog = { id: uid(), ts: new Date().toISOString(), type, message, appId };
    setLogs((prev) => {
      const next = [entry, ...prev].slice(0, 120);
      persistLogs(next);
      return next;
    });
  }

  function clearLogs() {
    setLogs([]);
    safeLSRemove(LS.activityLogs);
    pushToast({ tone: "success", message: "업데이트 로그를 비웠어요 ✓" });
  }

  async function copyLogs() {
    const text = logs
      .slice(0, 60)
      .map((l) => `${new Date(l.ts).toLocaleString()} [${l.type}] ${l.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text || "(empty)");
      pushToast({ tone: "success", message: "로그 복사됨 ✓" });
    } catch {
      pushToast({ tone: "error", message: "복사 실패 (브라우저 권한을 확인해주세요)" });
    }
  }

  // ===== Pins helpers =====
  function persistPins(next: string[]) {
    safeLSSet(LS.focusPins, JSON.stringify(next));
  }

  function togglePin(id: string) {
    setPins((prev) => {
      const exists = prev.includes(id);

      if (exists) {
        const next = prev.filter((x) => x !== id);
        persistPins(next);
        pushToast({ tone: "success", message: "Focus 핀 해제 ✓" });
        pushLog("PIN", "Focus 핀 해제", id);
        return next;
      }

      // ✅ 진실: 핀 자체는 막지 않음 (표시 제한은 TodayTab에서 1 vs 3)
      const next = [id, ...prev];
      persistPins(next);
      pushToast({ tone: "success", message: "Focus에 핀했어요 📌" });
      pushLog("PIN", "Focus 핀 추가", id);
      return next;
    });
  }

  // ===== Selection helpers =====
  function selectAllVisible(visibleIds: string[]) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      for (const id of visibleIds) s.add(id);
      return Array.from(s);
    });
  }
  function deselectAllVisible(visibleIds: string[]) {
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  }

  // ===== Navigation helpers =====
  function goToAddForm() {
    requestAnimationFrame(() => {
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => companyInputRef.current?.focus(), 160);
    });
  }

  function quickAddForDate(dateKey: string) {
    // Calendar에서 빈 날짜 클릭 → 아래 '지원 추가' 폼으로 이동하고,
    // 팔로업 시간을 해당 날짜 09:00로 미리 채웁니다.
    const iso = dateKeyToISOMorning(dateKey, 9, 0);
    setFollowupLocal(isoToDateTimeLocalInput(iso));

    // 옵션(마감/팔로업/Next/Source) 섹션 자동으로 펼치기
    if (addOptionsRef.current) addOptionsRef.current.open = true;

    pushToast({
      tone: "default",
      message: `${dateKey} 날짜로 팔로업이 미리 입력됐어요. 회사/직무를 입력하고 '추가'를 눌러주세요.`,
    });

    goToAddForm();
  }

  // ===== Initial load: pins/logs/tutorial/onboarding =====
  useEffect(() => {
    // pins
    const loadedPins = safeJsonParse<string[]>(safeLSGet(LS.focusPins), []);
    setPins(Array.isArray(loadedPins) ? loadedPins : []);

    // logs
    const loadedLogs = safeJsonParse<ActivityLog[]>(safeLSGet(LS.activityLogs), []);
    setLogs(Array.isArray(loadedLogs) ? loadedLogs : []);

    // tutorial
    const tutorialDone = safeLSGet(LS.tutorialDone) === "1";
    if (!tutorialDone) setTutorialOpen(true);
  }, []);

  useEffect(() => {
    const dismissed = safeLSGet(LS.onboardingDismissed) === "1";
    if (!dismissed && (apps?.length ?? 0) === 0) setShowOnboarding(true);
  }, [apps]);

  function dismissOnboarding() {
    safeLSSet(LS.onboardingDismissed, "1");
    setShowOnboarding(false);
  }

  // Clean pins if apps removed
  useEffect(() => {
    setPins((prev) => {
      const existIds = new Set(apps.map((a) => a.id));
      const next = prev.filter((id) => existIds.has(id));
      if (next.length !== prev.length) persistPins(next);
      return next;
    });
  }, [apps]);

  // ===== Keyboard shortcuts (desktop-first) =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select";

      // Esc는 어디서든 닫기
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setQuickOpen(false);
        setTutorialOpen(false);
        setUpdatesOpen(false);
        setProfileMenuOpen(false);
        return;
      }
      if (isTyping) return;

      // ✅ Undo: Ctrl/Cmd + Z (입력 중이면 브라우저 기본 undo 사용)
      if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        void undoLast();
        return;
      }

      // N: Today 빠른추가
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (viewMode !== "TODAY") setViewMode("TODAY");
        setQuickOpen((v) => !v);
      }

      // / : List 검색 포커스
      if (e.key === "/") {
        e.preventDefault();
        if (viewMode !== "LIST") setViewMode("LIST");
        window.setTimeout(() => listSearchRef.current?.focus(), 80);
      }

      // C : Calendar
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setViewMode("CALENDAR");
      }

      // R : Report
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        setViewMode("REPORT");
      }

      // U : Updates
      if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        setUpdatesOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode]);

  // ===== CRUD helpers =====

  async function updateApplicationFields(
    id: string,
    fields: Partial<
      Pick<
        Application,
        | "company"
        | "role"
        | "url"
        | "stage"
        | "deadline_at"
        | "next_action"
        | "followup_at"
        | "source"
        | "position"
      >
    >,
    opts?: { toast?: boolean; toastMsg?: string; log?: boolean; logType?: ActivityType; logMsg?: string }
  ) {
    setBusyId(id);

    const { data, error } = await supabase
      .from("applications")
      .update(fields)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      setBusyId(null);
      if (opts?.toast !== false) pushToast({ tone: "error", message: "저장 실패: " + error.message });
      return { ok: false as const, error };
    }

    setApps((prev) => prev.map((a) => (a.id === id ? (data as Application) : a)));
    setBusyId(null);

    if (opts?.toast !== false) {
      pushToast({ tone: "success", message: opts?.toastMsg ?? "저장됨 ✓" });
    }
    if (opts?.log) {
      pushLog(opts.logType ?? "UPDATE", opts.logMsg ?? "항목 수정", id);
    }

    return { ok: true as const, data: data as Application };
  }

  async function markDone(id: string) {
    await updateApplicationFields(
      id,
      { next_action: null, followup_at: null },
      { toast: true, toastMsg: "완료 처리 ✓", log: true, logType: "UPDATE", logMsg: "완료 처리(next/followup 비움)" }
    );
  }

  async function followupDoneOnly(id: string) {
    await updateApplicationFields(
      id,
      { followup_at: null },
      { toast: true, toastMsg: "팔로업 완료 ✓", log: true, logType: "UPDATE", logMsg: "팔로업 완료(followup만 비움)" }
    );
  }

  async function postponeFollowup(id: string, days: 3 | 7) {
    const current = apps.find((a) => a.id === id)?.followup_at;
    const base = current ? new Date(current) : new Date();
    const iso = addDays(base, days).toISOString();

    await updateApplicationFields(
      id,
      { followup_at: iso },
      { toast: true, toastMsg: `팔로업 +${days}일`, log: true, logType: "UPDATE", logMsg: `팔로업 +${days}일` }
    );
  }

  async function updateStage(id: string, nextStage: Stage) {
    const nextPos = nextPositionForStage(apps, nextStage);
    await updateApplicationFields(
      id,
      { stage: nextStage, position: nextPos },
      { toast: true, toastMsg: "단계 변경 ✓", log: true, logType: "STAGE", logMsg: `단계 변경 → ${stageLabel(nextStage)}` }
    );
  }

  async function applySubmittedFromDeadline(id: string) {
    const nextStage: Stage = "APPLIED";
    const nextPos = nextPositionForStage(apps, nextStage);
    await updateApplicationFields(
      id,
      { stage: nextStage, position: nextPos, deadline_at: null },
      { toast: true, toastMsg: "지원 완료 처리 ✓", log: true, logType: "STAGE", logMsg: "지원 완료(APPLIED) + 마감 제거" }
    );
  }

  async function moveEventDate(appId: string, type: CalendarEventType, targetDateKey: string) {
    // ✅ Pro 기능: 캘린더 드래그 이동
    if (!guard("calendar_drag")) return;

    if (type === "DEADLINE") {
      const iso = dateInputToISOEndOfDay(targetDateKey);
      await updateApplicationFields(
        appId,
        { deadline_at: iso },
        { toast: true, toastMsg: "마감일 이동 ✓", log: true, logType: "MOVE_DATE", logMsg: `마감일 이동 → ${targetDateKey}` }
      );
    } else {
      const iso = dateKeyToISOMorning(targetDateKey, 9, 0);
      await updateApplicationFields(
        appId,
        { followup_at: iso },
        { toast: true, toastMsg: "팔로업 이동 ✓", log: true, logType: "MOVE_DATE", logMsg: `팔로업 이동 → ${targetDateKey}` }
      );
    }
  }

  // ===== Delete with Undo (5s) =====
  const pendingDeleteRef = useRef<Record<string, { app: Application; timer: number }>>({});

  function scheduleDelete(id: string) {
    const target = apps.find((a) => a.id === id);
    if (!target) return;

    setApps((prev) => prev.filter((a) => a.id !== id));
    pushLog("DELETE", `삭제(대기): ${target.company} / ${target.role}`, id);

    const timer = window.setTimeout(async () => {
      delete pendingDeleteRef.current[id];

      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) {
        setApps((prev) => [target, ...prev]);
        pushToast({ tone: "error", message: "삭제 실패: " + error.message });
        pushLog("DELETE", `삭제 실패: ${target.company} / ${target.role} (${error.message})`, id);
        return;
      }

      pushToast({ tone: "success", message: "삭제 완료" });
      pushLog("DELETE", `삭제 완료: ${target.company} / ${target.role}`, id);
    }, 5000);

    pendingDeleteRef.current[id] = { app: target, timer };

    pushToast({
      tone: "default",
      message: "삭제됨 (5초 안에 되돌릴 수 있어요)",
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeleteRef.current[id];
          if (!pending) return;
          window.clearTimeout(pending.timer);
          delete pendingDeleteRef.current[id];
          setApps((prev) => [pending.app, ...prev]);
          pushToast({ tone: "success", message: "되돌렸어요 ✓" });
          pushLog("UNDO_DELETE", `삭제 Undo: ${pending.app.company} / ${pending.app.role}`, id);
        },
      },
      durationMs: 5200,
    });
  }

  // ===== Add helpers =====
  async function addApplicationBase(payload: {
    company: string;
    role: string;
    url?: string;
    deadlineDate?: string;
    followupLocal?: string;
    nextAction?: string;
    source?: string;
  }) {
    // ✅ 사전 UX 가드(서버에서 최종으로 막히지만, 사용자는 먼저 안내받는 게 좋음)
    if (!guard("create_application")) return null;

    const c = payload.company.trim();
    const r = payload.role.trim();

    if (!c || !r) {
      pushToast({ tone: "error", message: "회사/직무는 필수입니다." });
      return null;
    }

    const u = (payload.url ?? "").trim();
    const urlValue = u ? u : "";

    const deadlineISO = payload.deadlineDate ? dateInputToISOEndOfDay(payload.deadlineDate) : null;
    const followupISO = payload.followupLocal ? dateTimeLocalToISO(payload.followupLocal) : null;

    const nextActionValue = payload.nextAction?.trim() ? payload.nextAction.trim() : null;
    const sourceValue = payload.source?.trim() ? payload.source.trim() : null;

    const stage: Stage = "SAVED";

    const position = nextPositionForStage(apps, stage);
    const { data, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        company: c,
        role: r,
        url: urlValue,
        stage,
        deadline_at: deadlineISO,
        position,
        next_action: nextActionValue,
        followup_at: followupISO,
        source: sourceValue,
      })
      .select("*")
      .single();

    if (error) {
      const msg = planLimitFriendlyMessage(error.message);
      pushToast({ tone: "error", message: "추가 실패: " + msg });

      if (isPlanLimitErrorMessage(error.message)) {
        openPaywall(msg);
      }
      return null;
    }

    setApps((prev) => [data as Application, ...prev]);
    pushToast({ tone: "success", message: "추가 완료! ✓" });
    pushLog("CREATE", `추가: ${c} / ${r}`, (data as Application).id);

    return data as Application;
  }

  async function addQuick() {
    if (quickBusy) return;
    setQuickBusy(true);
    const res = await addApplicationBase({
      company: quickCompany,
      role: quickRole,
      url: quickUrl,
    });
    setQuickBusy(false);
    if (res) {
      setQuickCompany("");
      setQuickRole("");
      setQuickUrl("");
      setQuickOpen(false);
    }
  }

  async function addFull() {
    const res = await addApplicationBase({
      company,
      role,
      url,
      deadlineDate,
      followupLocal,
      nextAction,
      source,
    });
    if (res) {
      setCompany("");
      setRole("");
      setUrl("");
      setDeadlineDate("");
      setFollowupLocal("");
      setNextAction("");
      setSource("");
    }
  }

  function daysFromNowISO(n: number) {
    return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
  }

  async function addSampleData() {
    // 샘플도 제한 걸리도록 동일 가드
    if (!guard("create_application")) return;

    const samples = [
      {
        user_id: userId,
        company: "(샘플) A사",
        role: "Frontend Engineer",
        url: "https://example.com/job/1",
        stage: "APPLYING" as Stage,
        deadline_at: daysFromNowISO(2),
        position: nextPositionForStage(apps, "APPLYING"),
        next_action: "이력서 최신화 + 포트폴리오 링크 점검",
        followup_at: daysFromNowISO(1),
        source: "sample",
      },
      {
        user_id: userId,
        company: "(샘플) B사",
        role: "Backend Engineer",
        url: "https://example.com/job/2",
        stage: "INTERVIEW" as Stage,
        deadline_at: daysFromNowISO(5),
        position: nextPositionForStage(apps, "INTERVIEW"),
        next_action: "면접 질문 10개 준비",
        followup_at: null,
        source: "sample",
      },
      {
        user_id: userId,
        company: "(샘플) C사",
        role: "Product Designer",
        url: "https://example.com/job/3",
        stage: "SAVED" as Stage,
        deadline_at: null,
        position: nextPositionForStage(apps, "SAVED"),
        next_action: "JD 분석 후 포트폴리오 매칭",
        followup_at: daysFromNowISO(3),
        source: "sample",
      },
    ];

    const { data, error } = await supabase.from("applications").insert(samples).select("*");
    if (error) {
      const msg = planLimitFriendlyMessage(error.message);
      pushToast({ tone: "error", message: "샘플 추가 실패: " + msg });
      if (isPlanLimitErrorMessage(error.message)) openPaywall(msg);
      return;
    }

    setApps((prev) => [...(data as Application[]), ...prev]);
    pushToast({ tone: "success", message: "샘플 데이터 추가 완료 ✓" });
    pushLog("CREATE", "샘플 데이터 추가");
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.href = "/login";
  }

  // ===== Detail selection =====
  const selected = useMemo(() => {
    if (!selectedId) return null;
    return apps.find((a) => a.id === selectedId) ?? null;
  }, [selectedId, apps]);

  function openDetails(id: string) {
    setSelectedId(id);
    setDrawerOpen(true);
  }

  // ===== Drawer form state + Auto-save =====
  const [edCompany, setEdCompany] = useState("");
  const [edRole, setEdRole] = useState("");
  const [edUrl, setEdUrl] = useState("");
  const [edStage, setEdStage] = useState<Stage>("SAVED");
  const [edDeadline, setEdDeadline] = useState("");
  const [edFollowup, setEdFollowup] = useState("");
  const [edNext, setEdNext] = useState("");
  const [edSource, setEdSource] = useState("");
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const lastSavedSigRef = useRef<string>("");

  useEffect(() => {
    if (!selected) return;

    setEdCompany(selected.company ?? "");
    setEdRole(selected.role ?? "");
    setEdUrl((selected.url ?? "") || "");
    setEdStage(selected.stage);
    setEdDeadline(selected.deadline_at ? isoToDateInput(selected.deadline_at) : "");
    setEdFollowup(selected.followup_at ? isoToDateTimeLocalInput(selected.followup_at) : "");
    setEdNext(selected.next_action ?? "");
    setEdSource(selected.source ?? "");

    // baseline signature
    const baseline = JSON.stringify({
      company: selected.company ?? "",
      role: selected.role ?? "",
      url: (selected.url ?? "") || "",
      stage: selected.stage,
      deadline: selected.deadline_at ? isoToDateInput(selected.deadline_at) : "",
      followup: selected.followup_at ? isoToDateTimeLocalInput(selected.followup_at) : "",
      next: selected.next_action ?? "",
      source: selected.source ?? "",
    });
    lastSavedSigRef.current = baseline;
    setAutoSaveState("idle");
  }, [selected?.id]);

  const draftSig = useMemo(() => {
    return JSON.stringify({
      company: edCompany,
      role: edRole,
      url: edUrl,
      stage: edStage,
      deadline: edDeadline,
      followup: edFollowup,
      next: edNext,
      source: edSource,
    });
  }, [edCompany, edRole, edUrl, edStage, edDeadline, edFollowup, edNext, edSource]);

  // Auto-save debounce
  useEffect(() => {
    if (!drawerOpen || !selectedId || !selected) return;
    if (busyId === selectedId) return;

    if (draftSig === lastSavedSigRef.current) {
      setAutoSaveState("idle");
      return;
    }

    setAutoSaveState("saving");
    const t = window.setTimeout(async () => {
      const c = edCompany.trim();
      const r = edRole.trim();
      if (!c || !r) {
        setAutoSaveState("error");
        return;
      }

      const u = edUrl.trim();
      const urlValue = u ? u : "";

      const deadlineISO = edDeadline ? dateInputToISOEndOfDay(edDeadline) : null;
      const followupISO = dateTimeLocalToISO(edFollowup);
      const nextValue = edNext.trim() ? edNext.trim() : null;
      const sourceValue = edSource.trim() ? edSource.trim() : null;

      const stageChanged = selected.stage !== edStage;
      const nextPos = stageChanged ? nextPositionForStage(apps, edStage) : selected.position ?? 1;

      const res = await updateApplicationFields(
        selectedId,
        {
          company: c,
          role: r,
          url: urlValue,
          stage: edStage,
          position: nextPos,
          deadline_at: deadlineISO,
          followup_at: followupISO,
          next_action: nextValue,
          source: sourceValue,
        },
        {
          toast: false, // autosave는 토스트 남발 방지
          log: false, // autosave는 로그 남발 방지
        }
      );

      if (!res.ok) {
        setAutoSaveState("error");
        return;
      }

      lastSavedSigRef.current = draftSig;
      setAutoSaveState("saved");
      window.setTimeout(() => setAutoSaveState("idle"), 900);
    }, 700);

    return () => window.clearTimeout(t);
  }, [draftSig, drawerOpen, selectedId, selected, busyId]); // intentionally include busyId

  async function saveDetailsManual() {
    if (!selectedId || !selected) return;

    const c = edCompany.trim();
    const r = edRole.trim();
    if (!c || !r) {
      pushToast({ tone: "error", message: "회사/직무는 필수입니다." });
      return;
    }

    const u = edUrl.trim();
    const urlValue = u ? u : "";

    const deadlineISO = edDeadline ? dateInputToISOEndOfDay(edDeadline) : null;
    const followupISO = dateTimeLocalToISO(edFollowup);
    const nextValue = edNext.trim() ? edNext.trim() : null;
    const sourceValue = edSource.trim() ? edSource.trim() : null;

    const stageChanged = selected.stage !== edStage;
    const nextPos = stageChanged ? nextPositionForStage(apps, edStage) : selected.position ?? 1;

    const res = await updateApplicationFields(
      selectedId,
      {
        company: c,
        role: r,
        url: urlValue,
        stage: edStage,
        position: nextPos,
        deadline_at: deadlineISO,
        followup_at: followupISO,
        next_action: nextValue,
        source: sourceValue,
      },
      { toast: true, toastMsg: "저장됨 ✓", log: true, logType: "UPDATE", logMsg: "상세 저장(수동)" }
    );

    if (res.ok) {
      lastSavedSigRef.current = draftSig;
      setAutoSaveState("saved");
      window.setTimeout(() => setAutoSaveState("idle"), 900);
    }
  }

  // ===== Derived: weekData/todayData/kpi/list =====
  const weekData = useMemo(() => {
    const now = new Date();
    const start = startOfWeekMonday(now);
    const end = endOfWeekSunday(now);
    const activeApps = apps.filter((a) => isActiveStage(a.stage));

    const weekDeadlines = activeApps
      .filter((a) => inRange(a.deadline_at, start, end))
      .sort((a, b) => {
        const at = a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity;
        const bt = b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity;
        return at - bt;
      });

    const weekFollowups = activeApps
      .filter((a) => inRange(a.followup_at, start, end))
      .sort((a, b) => {
        const at = a.followup_at ? new Date(a.followup_at).getTime() : Infinity;
        const bt = b.followup_at ? new Date(b.followup_at).getTime() : Infinity;
        return at - bt;
      });

    const stageCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
      acc[s.value] = 0;
      return acc;
    }, {});
    for (const a of activeApps) stageCounts[a.stage] = (stageCounts[a.stage] ?? 0) + 1;

    return { start, end, weekDeadlines, weekFollowups, stageCounts };
  }, [apps]);

  const todayData = useMemo(() => {
    const activeApps = apps.filter((a) => isActiveStage(a.stage));

    const dueSoon = activeApps
      .filter((a) => {
        if (!a.deadline_at) return false;
        const d = calcDDay(a.deadline_at);
        return d >= 0 && d <= todayWindowDays;
      })
      .sort((a, b) => {
        const at = a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity;
        const bt = b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity;
        return at - bt;
      });

    const followupSoon = activeApps
      .filter(
        (a) => isWithinNextDays(a.followup_at, todayWindowDays) || (a.followup_at ? calcDDay(a.followup_at) < 0 : false)
      )
      .sort((a, b) => {
        const ad = a.followup_at ? calcDDay(a.followup_at) : 999;
        const bd = b.followup_at ? calcDDay(b.followup_at) : 999;
        // overdue 먼저
        if (ad < 0 && bd >= 0) return -1;
        if (bd < 0 && ad >= 0) return 1;
        // 가까운 날짜 먼저
        const at = a.followup_at ? new Date(a.followup_at).getTime() : Infinity;
        const bt = b.followup_at ? new Date(b.followup_at).getTime() : Infinity;
        return at - bt;
      });

    const actionOnly = activeApps
      .filter((a) => {
        const hasAction = !!a.next_action?.trim();
        const noFollowup = !a.followup_at;
        const noDeadline = !a.deadline_at;
        return hasAction && noFollowup && noDeadline;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { dueSoon, followupSoon, actionOnly };
  }, [apps, todayWindowDays]);

  const kpi = useMemo(() => {
    const active = apps.filter((a) => isActiveStage(a.stage));
    const activeCount = active.length;

    const weekDeadlineCount = weekData.weekDeadlines.length;
    const deadlineIds = new Set(weekData.weekDeadlines.map((a) => a.id));
    const weekFollowupCount = weekData.weekFollowups.filter((a) => !deadlineIds.has(a.id)).length;

    const due7 = active.filter((a) => {
      if (!a.deadline_at) return false;
      const d = calcDDay(a.deadline_at);
      return d >= 0 && d <= 7;
    }).length;

    const followup7 = active.filter(
      (a) => isWithinNextDays(a.followup_at, 7) || (a.followup_at ? calcDDay(a.followup_at) < 0 : false)
    ).length;

    return { activeCount, weekDeadlineCount, weekFollowupCount, due7, followup7 };
  }, [apps, weekData]);

  const listApps = useMemo(() => {
    let result = apps;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((a) => `${a.company} ${a.role}`.toLowerCase().includes(q));
    }

    if (filter === "DUE_SOON") {
      result = result.filter((a) => {
        if (!a.deadline_at) return false;
        const d = calcDDay(a.deadline_at);
        return d >= 0 && d <= 7;
      });
    } else if (filter !== "ALL") {
      result = result.filter((a) => a.stage === filter);
    }

    const sorted = [...result];

    if (sortMode === "POSITION") {
      sorted.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    } else if (sortMode === "CREATED_DESC") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortMode === "DEADLINE") {
      sorted.sort((a, b) => {
        const at = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.POSITIVE_INFINITY;
        const bt = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
      });
    }

    return sorted;
  }, [apps, filter, sortMode, query]);

  // keep positionOrderIds synced when drag mode active
  useEffect(() => {
    if (!dragEnabled) return;
    const ids = listApps.map((a) => a.id);
    setPositionOrderIds(ids);
  }, [dragEnabled, listApps]);

  const visibleListApps = useMemo(() => {
    if (!dragEnabled) return listApps;

    const map = new Map(apps.map((a) => [a.id, a] as const));
    const ordered = positionOrderIds.map((id) => map.get(id)).filter(Boolean) as Application[];
    return ordered;
  }, [dragEnabled, listApps, positionOrderIds, apps]);

  // ===== Focus + Action Queue =====
  const focusApps = useMemo(() => {
    return pins
      .map((id) => apps.find((a) => a.id === id) ?? null)
      .filter((x): x is Application => !!x)
      .filter((a) => isActiveStage(a.stage));
  }, [pins, apps]);

  // ✅ actionQueue는 actionQueue만 계산하고 끝(여기 안에 todayXXX 넣으면 스코프 문제 생김)
  const actionQueue = useMemo(() => {
    const active = apps.filter((a) => isActiveStage(a.stage));
    // 큐 후보: deadline/followup/next_action 중 하나라도 있으면 포함
    const candidates = active.filter((a) => !!a.deadline_at || !!a.followup_at || !!a.next_action?.trim());

    const scored = candidates
      .map((a) => ({ a, score: priorityScore(a) }))
      .sort((x, y) => {
        const xp = pinnedSet.has(x.a.id) ? 1 : 0;
        const yp = pinnedSet.has(y.a.id) ? 1 : 0;
        if (xp !== yp) return yp - xp; // pinned first
        return y.score - x.score;
      })
      .map((x) => x.a);

    return scored;
  }, [apps, pinnedSet]);

  /** =========================
   *  TODAY 몰입 UX (A안)
   *  - Activity Streak
   *  - Today Score
   *  - Today Focus (Top 1 vs 3 by plan)
   *  - Today Empty State
   *  ========================= */

  // 로컬 날짜키 (YYYY-MM-DD) - 사용자의 로컬 타임존 기준
  function toLocalDateKey(isoOrTs: string) {
    const d = new Date(isoOrTs);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function shiftLocalDateKey(dateKey: string, days: number) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const base = new Date(y, (m ?? 1) - 1, d ?? 1);
    base.setDate(base.getDate() + days);
    return toLocalDateKey(base.toISOString());
  }

  // Today Score 규칙
  const SCORE_BY_TYPE: Partial<Record<ActivityType, number>> = {
    CREATE: 10,
    STAGE: 5,
    MOVE_DATE: 3,
    UPDATE: 2,
    PIN: 1,
    BATCH: 2,
    UNDO: 1,
    UNDO_DELETE: 1,
  };

  const todayMeta = useMemo(() => {
    const todayKey = toLocalDateKey(new Date().toISOString());

    const daySet = new Set<string>();
    let scoreToday = 0;

    for (const l of logs) {
      const k = toLocalDateKey(l.ts);
      daySet.add(k);
      if (k === todayKey) scoreToday += SCORE_BY_TYPE[l.type] ?? 0;
    }

    // streak: 오늘부터 거꾸로 연속 체크
    let streak = 0;
    for (let i = 0; i < 370; i++) {
      const k = shiftLocalDateKey(todayKey, -i);
      if (daySet.has(k)) streak++;
      else break;
    }

    return {
      todayKey,
      scoreToday,
      streak,
      hasActivityToday: scoreToday > 0,
    };
  }, [logs]);

  const todayFocusCandidates = useMemo(() => {
    const candidateIds = new Set<string>();
    const list: Application[] = [];

    const pushUnique = (a: Application) => {
      if (!a) return;
      if (candidateIds.has(a.id)) return;
      candidateIds.add(a.id);
      list.push(a);
    };

    for (const a of todayData.dueSoon) pushUnique(a);
    for (const a of todayData.followupSoon) pushUnique(a);
    for (const a of todayData.actionOnly) pushUnique(a);

    list.sort((a, b) => priorityScore(b) - priorityScore(a));
    return list;
  }, [todayData]);

  const todayFocusTop3 = useMemo(() => todayFocusCandidates.slice(0, 3), [todayFocusCandidates]);

  const todayFocusVisible = useMemo(() => {
    const n = plan === "free" ? 1 : 3;
    return todayFocusTop3.slice(0, n);
  }, [todayFocusTop3, plan]);

  const todayEmptyState = useMemo(() => {
    const hasAnyTodo =
      todayData.dueSoon.length > 0 ||
      todayData.followupSoon.length > 0 ||
      todayData.actionOnly.length > 0;

    if (!todayMeta.hasActivityToday && !hasAnyTodo) {
      return {
        kind: "EMPTY_ALL" as const,
        title: "오늘은 아직 아무 활동이 없어요.",
        body: "작은 행동 하나가 합격으로 이어져요. 회사/직무만 먼저 추가해볼까요?",
      };
    }

    if (!todayMeta.hasActivityToday && hasAnyTodo) {
      return {
        kind: "EMPTY_ACTION" as const,
        title: "오늘은 아직 체크한 게 없어요.",
        body: "아래 항목 중 하나만 처리해도 streak가 이어져요 🔥",
      };
    }

    return null;
  }, [
    todayMeta.hasActivityToday,
    todayData.dueSoon.length,
    todayData.followupSoon.length,
    todayData.actionOnly.length,
  ]);

  // ===== Summary copy (toast로 피드백) =====
  function buildWeeklyOneLineSummary() {
    const excluded = new Set(EXCLUDED_TODAY_STAGES);
    const activeStages = STAGES.filter((s) => !excluded.has(s.value));
    const stageParts = activeStages
      .map((s) => {
        const n = weekData.stageCounts[s.value] ?? 0;
        return n > 0 ? `${s.label} ${n}` : null;
      })
      .filter(Boolean)
      .join(", ");

    return `이번주 마감 ${weekData.weekDeadlines.length}건 | 진행: ${stageParts || "없음"} | Today ${todayData.dueSoon.length}건`;
  }

  function buildWeeklySummaryText() {
    const now = new Date();
    const startStr = formatDateOnly(weekData.start.toISOString());
    const endStr = formatDateOnly(weekData.end.toISOString());

    const lines: string[] = [];
    lines.push(`📌 이번 주 지원 요약 (${startStr} ~ ${endStr})`);
    lines.push("");

    const shortMeta = (a: Application) => {
      const next = a.next_action?.trim() ? `Next: ${a.next_action.trim()}` : `Next: -`;
      const src = a.source?.trim() ? `Source: ${a.source.trim()}` : `Source: -`;
      const url = safeHttpUrl(a.url);
      const urlLine = url ? `URL: ${new URL(url).hostname}${new URL(url).pathname}` : null;
      return { next, src, urlLine };
    };

    const lineDeadline = (a: Application) => {
      const dateStr = formatDateOnly(a.deadline_at);
      const dday = a.deadline_at ? ddayBadge(calcDDay(a.deadline_at)).text : "";
      const meta = shortMeta(a);
      const out: string[] = [];
      out.push(`- ${dateStr} ${dday} | ${a.company} / ${a.role} (${stageLabel(a.stage)})`);
      out.push(`  ${meta.next} | ${meta.src}`);
      if (meta.urlLine) out.push(`  ${meta.urlLine}`);
      return out.join("\n");
    };

    lines.push(`⏰ 이번 주 마감 (${weekData.weekDeadlines.length})`);
    if (weekData.weekDeadlines.length === 0) lines.push("- 없음");
    else for (const a of weekData.weekDeadlines) lines.push(lineDeadline(a));
    lines.push("");

    const deadlineIds = new Set(weekData.weekDeadlines.map((a) => a.id));
    const uniqueWeekFollowups = weekData.weekFollowups.filter((a) => !deadlineIds.has(a.id));

    lines.push(`📩 이번 주 팔로업 (${uniqueWeekFollowups.length})`);
    if (uniqueWeekFollowups.length === 0) lines.push("- 없음");
    else {
      for (const a of uniqueWeekFollowups) {
        const meta = shortMeta(a);
        const dateStr = formatDateOnly(a.followup_at);
        const dday = a.followup_at ? ddayBadge(calcDDay(a.followup_at)).text : "";
        const deadlineHint = a.deadline_at
          ? ` / 마감: ${formatDateOnly(a.deadline_at)} ${ddayBadge(calcDDay(a.deadline_at)).text}`
          : "";
        lines.push(`- ${dateStr} ${dday} | ${a.company} / ${a.role} (${stageLabel(a.stage)})${deadlineHint}`);
        lines.push(`  ${meta.next} | ${meta.src}`);
        if (meta.urlLine) lines.push(`  ${meta.urlLine}`);
      }
    }
    lines.push("");

    const excluded = new Set(EXCLUDED_TODAY_STAGES);
    const activeStages = STAGES.filter((s) => !excluded.has(s.value));

    lines.push("📊 진행 현황(Active)");
    let any = false;
    for (const s of activeStages) {
      const n = weekData.stageCounts[s.value] ?? 0;
      if (n > 0) {
        any = true;
        lines.push(`- ${s.label}: ${n}`);
      }
    }
    if (!any) lines.push("- (Active 항목 없음)");
    lines.push("");

    lines.push(`✅ Today(${todayWindowDays}일, 생성 시각: ${now.toLocaleString()})`);
    lines.push(
      `- 마감 ${todayData.dueSoon.length} / 팔로업 ${todayData.followupSoon.length} / next_action-only ${todayData.actionOnly.length}`
    );
    lines.push("");
    lines.push("(요약 생성 완료)");

    return lines.join("\n");
  }

  async function copyWeeklySummary() {
    try {
      await navigator.clipboard.writeText(buildWeeklySummaryText());
      pushToast({ tone: "success", message: "이번 주 요약 복사됨 ✓" });
    } catch {
      pushToast({ tone: "error", message: "복사 실패 (브라우저 권한을 확인해주세요)" });
    }
  }

  async function copyWeeklyOneLine() {
    try {
      await navigator.clipboard.writeText(buildWeeklyOneLineSummary());
      pushToast({ tone: "success", message: "한 줄 요약 복사됨 ✓" });
    } catch {
      pushToast({ tone: "error", message: "복사 실패 (브라우저 권한을 확인해주세요)" });
    }
  }

  // ===== Batch actions (List 멀티선택) =====
  async function batchMarkDone(ids: string[]) {
    if (ids.length === 0) return;
    setBusyBatch(true);

    // optimistic
    const before = apps;
    setApps((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, next_action: null, followup_at: null } : a)));

    const { data, error } = await supabase
      .from("applications")
      .update({ next_action: null, followup_at: null })
      .in("id", ids)
      .select("*");

    setBusyBatch(false);

    if (error) {
      setApps(before);
      pushToast({ tone: "error", message: "배치 완료 실패: " + error.message });
      return;
    }

    const updated = (data ?? []) as Application[];
    setApps((prev) => prev.map((a) => updated.find((u) => u.id === a.id) ?? a));
    pushToast({ tone: "success", message: `완료 처리 ${ids.length}건 ✓` });
    pushLog("BATCH", `배치 완료 처리 ${ids.length}건`);
  }

  async function batchPostpone(ids: string[], days: 3 | 7) {
    if (ids.length === 0) return;
    setBusyBatch(true);

    const before = apps;

    try {
      const updates = await Promise.all(
        ids.map(async (id) => {
          const current = before.find((a) => a.id === id)?.followup_at;
          const base = current ? new Date(current) : new Date();
          const iso = addDays(base, days).toISOString();

          const { data, error } = await supabase
            .from("applications")
            .update({ followup_at: iso })
            .eq("id", id)
            .select("*")
            .single();
          if (error) throw error;
          return data as Application;
        })
      );

      setApps((prev) => prev.map((a) => updates.find((u) => u.id === a.id) ?? a));
      pushToast({ tone: "success", message: `팔로업 +${days}일 ${ids.length}건 ✓` });
      pushLog("BATCH", `배치 팔로업 +${days}일 ${ids.length}건`);
    } catch (e: any) {
      setApps(before);
      pushToast({ tone: "error", message: "배치 미루기 실패: " + (e?.message ?? "unknown") });
    } finally {
      setBusyBatch(false);
    }
  }

  async function batchSetStage(ids: string[], stage: Stage) {
    if (ids.length === 0) return;
    setBusyBatch(true);

    const before = apps;

    // stage별 position 충돌 방지: 현재 max + 순차 부여
    const baseMax = Math.max(0, ...before.filter((a) => a.stage === stage).map((a) => a.position ?? 0));
    const idToPos = new Map<string, number>();
    ids.forEach((id, idx) => idToPos.set(id, baseMax + idx + 1));

    // optimistic
    setApps((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, stage, position: idToPos.get(a.id) ?? a.position } : a)));

    try {
      const updates = await Promise.all(
        ids.map(async (id) => {
          const position = idToPos.get(id) ?? baseMax + 1;
          const { data, error } = await supabase
            .from("applications")
            .update({ stage, position })
            .eq("id", id)
            .select("*")
            .single();
          if (error) throw error;
          return data as Application;
        })
      );

      setApps((prev) => prev.map((a) => updates.find((u) => u.id === a.id) ?? a));
      pushToast({ tone: "success", message: `단계 변경 ${ids.length}건 ✓` });
      pushLog("BATCH", `배치 단계 변경 → ${stageLabel(stage)} (${ids.length}건)`);
    } catch (e: any) {
      setApps(before);
      pushToast({ tone: "error", message: "배치 단계 변경 실패: " + (e?.message ?? "unknown") });
    } finally {
      setBusyBatch(false);
    }
  }

  async function batchArchive(ids: string[]) {
    await batchSetStage(ids, "ARCHIVED");
  }

  function batchDelete(ids: string[]) {
    if (ids.length === 0) return;
    ids.forEach((id) => scheduleDelete(id));
    pushToast({ tone: "default", message: `삭제 예약 ${ids.length}건 (Undo 가능)` });
    pushLog("BATCH", `배치 삭제 예약 ${ids.length}건`);
    clearSelection();
  }

  function batchPin(ids: string[]) {
    const want = ids.filter((id) => !pinnedSet.has(id));
    if (want.length === 0) {
      pushToast({ tone: "default", message: "이미 모두 핀 되어 있어요." });
      return;
    }

    setPins((prev) => {
      const next = [...prev];
      for (const id of want) {
        if (next.includes(id)) continue;
        next.unshift(id);
      }
      persistPins(next);
      return next;
    });

    // ✅ 핀 자체는 제한 없음 (표시 제한은 TodayTab에서)
    pushToast({ tone: "success", message: `Focus 핀 적용 ✓ (${want.length}개)` });
    pushLog("BATCH", `배치 Focus 핀 (${want.length}개)`);
  }

  function batchUnpin(ids: string[]) {
    setPins((prev) => {
      const next = prev.filter((id) => !ids.includes(id));
      persistPins(next);
      return next;
    });
    pushToast({ tone: "success", message: "Focus 핀 해제 ✓" });
    pushLog("BATCH", "배치 Focus 핀 해제");
  }

  // ===== POSITION drag reorder persistence =====
  async function persistReorderForStage(stage: Stage, orderedIds: string[]) {
    setBusyBatch(true);
    const before = apps;

    // optimistic update positions 1..n within that stage filter
    const idToPos = new Map<string, number>();
    orderedIds.forEach((id, idx) => idToPos.set(id, idx + 1));

    setApps((prev) =>
      prev.map((a) => (a.stage === stage && idToPos.has(a.id) ? { ...a, position: idToPos.get(a.id)! } : a))
    );

    try {
      await Promise.all(
        orderedIds.map(async (id) => {
          const position = idToPos.get(id)!;
          const { error } = await supabase.from("applications").update({ position }).eq("id", id);
          if (error) throw error;
        })
      );

      pushToast({ tone: "success", message: "수동 정렬 저장 ✓" });
      pushLog("REORDER", `수동 정렬 저장(${stageLabel(stage)})`);
    } catch (e: any) {
      setApps(before);
      pushToast({ tone: "error", message: "정렬 저장 실패: " + (e?.message ?? "unknown") });
    } finally {
      setBusyBatch(false);
    }
  }

  function handleListDragStart(id: string) {
    if (!dragEnabled) return;
    setDraggingId(id);
  }

  function handleListDrop(overId: string) {
    if (!dragEnabled || !draggingId || draggingId === overId) {
      setDraggingId(null);
      return;
    }
    const from = positionOrderIds.indexOf(draggingId);
    const to = positionOrderIds.indexOf(overId);
    if (from < 0 || to < 0) {
      setDraggingId(null);
      return;
    }
    const next = [...positionOrderIds];
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    setPositionOrderIds(next);
    setDraggingId(null);

    if (stageFilterForDrag) {
      // persist
      persistReorderForStage(stageFilterForDrag, next);
    }
  }

  // ===== Calendar apps (Active only) =====
  const calendarApps = useMemo(() => apps.filter((a) => isActiveStage(a.stage)), [apps]);

  // ===== Tutorial steps =====
  const tutorialSteps: TutorialStep[] = useMemo(
    () => [
      {
        id: "welcome",
        title: "Job Tracker에 오신 걸 환영해요 👋",
        body:
          "이 앱은 ‘오늘 해야 할 일’이 자동으로 정리되도록 설계되어 있어요.\n" +
          "핵심은 3가지예요:\n" +
          "1) 빠르게 추가\n2) Focus Top3 핀\n3) 캘린더/리스트에서 빠른 처리",
        accent: "Esc로 언제든 닫을 수 있어요.",
      },
      {
        id: "quick_add",
        title: "빠른 추가 (N)",
        body:
          "회사/직무만 먼저 추가하고, 디테일은 나중에 채워도 돼요.\n" +
          "Today 화면에서 N 키로 빠른 추가를 열 수 있어요.",
        targetRef: quickAddBtnRef,
        accent: "단축키: N",
      },
      {
        id: "calendar",
        title: "캘린더에서 날짜 드래그로 이동",
        body:
          "마감/팔로업 칩을 드래그해서 다른 날짜로 옮길 수 있어요.\n" +
          "오른쪽 패널에서 그날 할 일을 바로 처리할 수도 있어요.",
        targetRef: calendarTabRef,
        accent: "단축키: C",
      },
      {
        id: "list",
        title: "리스트: 멀티선택 + 배치 처리",
        body:
          "리스트에서 여러 항목을 선택한 뒤, 완료/미루기/단계 변경/아카이브를 한 번에 처리할 수 있어요.\n" +
          "수동 정렬(POSITION)은 ‘단계 필터’를 선택했을 때 드래그로 정렬할 수 있어요.",
        targetRef: listTabRef,
        accent: "단축키: / 로 검색 포커스",
      },
      {
        id: "report",
        title: "리포트 & 업데이트 로그",
        body:
          "리포트에서 Stage/Source/Funnel을 확인하고,\n" + "최근 업데이트 로그로 내가 무엇을 했는지 추적할 수 있어요.",
        targetRef: reportTabRef,
        accent: "단축키: R(리포트), U(업데이트 로그)",
      },
      {
        id: "done",
        title: "준비 완료 ✅",
        body: "이제부터는 Today에서 Focus Top3를 핀하고, Action Queue를 따라가면 가장 효율적이에요.",
      },
    ],
    []
  );

  // ===== Render helpers =====
  const listVisibleIds = useMemo(() => visibleListApps.map((a) => a.id), [visibleListApps]);

  // ===== List Batch Bar UI =====
  const [bulkStage, setBulkStage] = useState<Stage>("APPLYING");

  // ===== TODAY Focus/Queue UI =====
  const [queueShowAll, setQueueShowAll] = useState(false);
  const queueVisible = queueShowAll ? actionQueue : actionQueue.slice(0, 8);
  const queueHasMore = actionQueue.length > 8;

  // ===== Tutorial open logic: allow reopening =====
  function reopenTutorial() {
    setTutorialStep(0);
    setTutorialOpen(true);
  }

  // ===== Render =====
  return {
    userId,
    userEmail,

    // ✅ SaaS
    plan,
    entitlements,
    planLoading,
    guard,
    openPaywall,
    paywallOpen,
    setPaywallOpen,
    paywallReason,
    reloadEntitlements: loadPlanAndEntitlements,

    // UI routing / view
    viewMode,
    setViewMode,
    profileMenuOpen,
    setProfileMenuOpen,

    // data
    apps,
    setApps,
    selectedId,
    selected,

    // refs (tutorial + shortcuts)
    quickAddBtnRef,
    calendarTabRef,
    listTabRef,
    reportTabRef,
    updatesBtnRef,
    addFormRef,
    companyInputRef,
    addOptionsRef,
    listSearchRef,

    // drawers / overlays
    drawerOpen,
    setDrawerOpen,
    updatesOpen,
    setUpdatesOpen,
    tutorialOpen,
    setTutorialOpen,
    tutorialStep,
    setTutorialStep,
    tutorialSteps,

    // toasts
    toasts,
    pushToast,
    dismissToast,

    // logs / updates
    logs,
    clearLogs,
    copyLogs,

    // onboarding
    showOnboarding,
    dismissOnboarding,

    // pins
    pins,
    pinnedSet,
    togglePin,

    // derived groups
    weekData,
    todayData,
    kpi,
    focusApps,
    actionQueue,
    queueShowAll,
    setQueueShowAll,
    queueVisible,
    queueHasMore,

    // ✅ TODAY 몰입 UX
    todayMeta,
    todayFocusTop3,
    todayFocusVisible,
    todayEmptyState,

    // calendar
    calendarApps,
    quickAddForDate,
    moveEventDate,

    // list view
    filter,
    setFilter,
    sortMode,
    setSortMode,
    query,
    setQuery,
    listApps,
    visibleListApps,
    listVisibleIds,
    selectedIds,
    setSelectedIds,
    bulkStage,
    setBulkStage,
    isSelected,
    toggleSelect,
    clearSelection,
    selectAllVisible,
    deselectAllVisible,
    dragEnabled,
    stageFilterForDrag,
    draggingId,
    handleListDragStart,
    handleListDrop,
    busyBatch,
    batchMarkDone,
    batchPostpone,
    batchSetStage,
    batchArchive,
    batchDelete,
    batchPin,
    batchUnpin,

    // add form + quick add
    company,
    setCompany,
    role,
    setRole,
    url,
    setUrl,
    deadlineDate,
    setDeadlineDate,
    followupLocal,
    setFollowupLocal,
    nextAction,
    setNextAction,
    source,
    setSource,

    quickOpen,
    setQuickOpen,
    quickCompany,
    setQuickCompany,
    quickRole,
    setQuickRole,
    quickUrl,
    setQuickUrl,
    quickBusy,

    // drawer edit fields
    edCompany,
    setEdCompany,
    edRole,
    setEdRole,
    edUrl,
    setEdUrl,
    edStage,
    setEdStage,
    edDeadline,
    setEdDeadline,
    edSource,
    setEdSource,
    autoSaveState,
    saveDetailsManual,

    // commands / mutations
    reopenTutorial,
    goToAddForm,
    openDetails,
    signOut,
    addSampleData,
    addQuick,
    addFull,
    markDone,
    followupDoneOnly,
    postponeFollowup,
    updateStage,
    applySubmittedFromDeadline,
    scheduleDelete,
    copyWeeklySummary,
    copyWeeklyOneLine,

    busyId,
    todayWindowDays,
    setTodayWindowDays,
  } as const;
}

export type DashboardController = ReturnType<typeof useDashboardController>;
