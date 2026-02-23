export const STAGES = [
  { id: 'SAVED', label: '저장' },
  { id: 'PREP', label: '지원 준비' },
  { id: 'APPLIED', label: '지원 완료' },
  { id: 'INTERVIEW', label: '면접' },
  { id: 'OFFER', label: '오퍼' },
  { id: 'REJECTED', label: '불합격' },
  { id: 'ARCHIVED', label: '보관' },
] as const;

export type Stage = (typeof STAGES)[number]['id'];

export const STAGE_IDS = new Set<Stage>(STAGES.map((s) => s.id));
