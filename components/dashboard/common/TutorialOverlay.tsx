import React, { useEffect, useState } from "react";

import { LS } from "../../../lib/applications/types";
import { safeLSSet } from "../../../lib/applications/selectors";

// ===== Tutorial Overlay (스포트라이트) =====
export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  targetRef?: React.RefObject<HTMLElement | null>;
  accent?: string;
};

export function TutorialOverlay({
  open,
  steps,
  stepIndex,
  onStepChange,
  onClose,
  onFinish,
}: {
  open: boolean;
  steps: TutorialStep[];
  stepIndex: number;
  onStepChange: (idx: number) => void;
  onClose: () => void;
  onFinish: () => void;
}) {
  const step = steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;

    const calc = () => {
      const el = step?.targetRef?.current;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect(r);
    };

    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    const t = window.setInterval(calc, 250);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
      window.clearInterval(t);
    };
  }, [open, step?.id, step?.targetRef]);

  if (!open) return null;

  const hasTarget = !!rect;
  const pad = 10;

  const highlightStyle: React.CSSProperties | undefined = hasTarget
    ? {
        left: Math.max(8, rect!.left - pad),
        top: Math.max(8, rect!.top - pad),
        width: Math.min(window.innerWidth - 16, rect!.width + pad * 2),
        height: Math.min(window.innerHeight - 16, rect!.height + pad * 2),
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/70" />
      {hasTarget ? (
        <div
          className="absolute rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] animate-pulse"
          style={highlightStyle}
        />
      ) : null}

      <div className="absolute inset-0 flex items-end md:items-center justify-center p-4">
        <div className="w-full max-w-[560px] rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur p-5 shadow-2xl">
          <div className="text-xs text-zinc-500">튜토리얼 {stepIndex + 1} / {steps.length}</div>
          <div className="mt-1 text-lg font-semibold">{step.title}</div>
          <div className="mt-2 text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
            {step.body}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                safeLSSet(LS.tutorialDone, "1");
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              건너뛰기
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onStepChange(Math.max(0, stepIndex - 1))}
                disabled={stepIndex === 0}
                className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
              >
                이전
              </button>

              {stepIndex === steps.length - 1 ? (
                <button
                  onClick={() => {
                    safeLSSet(LS.tutorialDone, "1");
                    onFinish();
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 font-medium text-sm"
                >
                  시작하기
                </button>
              ) : (
                <button
                  onClick={() => onStepChange(Math.min(steps.length - 1, stepIndex + 1))}
                  className="px-4 py-2 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 font-medium text-sm"
                >
                  다음
                </button>
              )}
            </div>
          </div>

          {step.accent ? (
            <div className="mt-3 text-xs text-zinc-500">
              Tip: <span className="text-zinc-200">{step.accent}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
