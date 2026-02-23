// lib/applications/scoring.ts
import { Application, Stage } from "./types";
import { calcDDay, isActiveStage, stageLabel } from "./selectors";

export const STAGE_WEIGHT: Record<Stage, number> = {
  SAVED: 8,
  APPLYING: 18,
  APPLIED: 26,
  TEST: 40,
  INTERVIEW: 55,
  OFFER: 80,
  REJECTED: -999,
  WITHDRAWN: -999,
  ARCHIVED: -999,
};

export function priorityScore(a: Application) {
  if (!isActiveStage(a.stage)) return -9999;

  let score = 0;

  // stage 기반
  score += STAGE_WEIGHT[a.stage] ?? 0;

  // deadline
  if (a.deadline_at) {
    const d = calcDDay(a.deadline_at);
    if (d < 0) score += 4;
    else score += Math.max(0, 60 - d * 6);
  }

  // followup
  if (a.followup_at) {
    const d = calcDDay(a.followup_at);
    if (d < 0) score += 65;
    else score += Math.max(0, 55 - d * 7);
  }

  // next_action
  if (a.next_action?.trim()) score += 10;

  // source
  if (a.source?.trim()) score += 2;

  return score;
}

export function priorityHint(a: Application) {
  const hints: string[] = [];

  if (a.followup_at) {
    const d = calcDDay(a.followup_at);
    hints.push(d < 0 ? `팔로업 지연(D+${Math.abs(d)})` : `팔로업 D-${d}`);
  }
  if (a.deadline_at) {
    const d = calcDDay(a.deadline_at);
    hints.push(d < 0 ? `마감 지남(D+${Math.abs(d)})` : `마감 D-${d}`);
  }

  hints.push(`Stage: ${stageLabel(a.stage)}`);
  return hints.join(" · ");
}
