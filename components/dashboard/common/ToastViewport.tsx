import React from "react";

// ===== Toast =====
export type ToastTone = "default" | "success" | "error";
export type Toast = {
  id: string;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
};

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-[80] space-y-2 w-[360px] max-w-[92vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "rounded-2xl border p-3 shadow-lg backdrop-blur",
            "transition-transform duration-200",
            t.tone === "success"
              ? "border-emerald-900/40 bg-emerald-950/60"
              : t.tone === "error"
              ? "border-red-900/40 bg-red-950/60"
              : "border-zinc-800 bg-zinc-950/70",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-zinc-100 leading-relaxed">{t.message}</div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
              title="닫기"
            >
              ✕
            </button>
          </div>

          {t.action ? (
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => {
                  t.action?.onClick();
                  onDismiss(t.id);
                }}
                className="text-xs px-3 py-1.5 rounded-full border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 font-medium"
              >
                {t.action.label}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
