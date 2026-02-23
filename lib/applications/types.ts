// lib/applications/types.ts

export type Stage =
  | "SAVED"
  | "APPLYING"
  | "APPLIED"
  | "TEST"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN"
  | "ARCHIVED";

export const STAGES: { value: Stage; label: string }[] = [
  { value: "SAVED", label: "저장" },
  { value: "APPLYING", label: "지원 준비" },
  { value: "APPLIED", label: "지원 완료" },
  { value: "TEST", label: "과제/코테" },
  { value: "INTERVIEW", label: "면접" },
  { value: "OFFER", label: "오퍼" },
  { value: "REJECTED", label: "불합격" },
  { value: "WITHDRAWN", label: "지원 철회" },
  { value: "ARCHIVED", label: "보관" },
];

export type Application = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  url: string | null;

  stage: Stage;
  deadline_at: string | null;
  created_at: string;
  position: number;

  next_action: string | null;
  followup_at: string | null;
  source: string | null;
};

export type Filter = "ALL" | "DUE_SOON" | Stage;
export type SortMode = "POSITION" | "DEADLINE" | "CREATED_DESC";
export type ViewMode = "TODAY" | "CALENDAR" | "LIST" | "REPORT";

export type CalendarEventType = "DEADLINE" | "FOLLOWUP";
export type CalendarDragPayload = { type: CalendarEventType; appId: string };

export type ActivityType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "UNDO_DELETE"
  | "STAGE"
  | "MOVE_DATE"
  | "REORDER"
  | "BATCH"
  | "PIN"
  | "UNDO";

export type ActivityLog = {
  id: string;
  ts: string; // ISO
  type: ActivityType;
  message: string;
  appId?: string;
};

export type UndoAction = {
  id: string;
  ts: string; // ISO
  label: string;
  undo: () => Promise<void>;
};

export const LS = {
  onboardingDismissed: "jt_onboarding_dismissed",
  tutorialDone: "jt_tutorial_done_v1",
  focusPins: "jt_focus_pins_v1",
  activityLogs: "jt_activity_logs_v1",
} as const;
