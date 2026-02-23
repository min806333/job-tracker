import React, { useEffect, useState } from "react";

// ===== Drawer (애니메이션 + UX 고급화) =====
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  widthPx = 560,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthPx?: number;
}) {
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setEnter(false);
      return;
    }
    const t = window.setTimeout(() => setEnter(true), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75]">
      <div
        className={[
          "absolute inset-0 bg-black/50 transition-opacity duration-200",
          enter ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={[
          "absolute right-0 top-0 h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl",
          "transition-transform duration-200 ease-out",
        ].join(" ")}
        style={{
          width: `${widthPx}px`,
          maxWidth: "92vw",
          transform: enter ? "translateX(0)" : "translateX(16px)",
        }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-zinc-400">상세</div>
                <div className="text-lg font-semibold truncate">{title}</div>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
              >
                닫기 (Esc)
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">{children}</div>

          {footer ? (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
