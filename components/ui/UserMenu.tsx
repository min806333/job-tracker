"use client";

import { useEffect, useRef, useState } from "react";

export function UserMenu({
  onAccount,
  onSupport,
  onSettings,
  onLogout,
}: {
  onAccount?: () => void;
  onSupport?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // 바깥 클릭 닫기
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    if (open) {
      document.addEventListener("mousedown", onDocMouseDown);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function clickAndClose(fn?: () => void) {
    return () => {
      setOpen(false);
      fn?.();
    };
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all grid place-items-center"
        aria-label="메뉴"
        title="메뉴"
      >
        <span className="text-xs text-zinc-300">⋯</span>
      </button>

      {/* Dropdown */}
      <div
        className={[
          "absolute right-0 mt-2 w-48 z-50",
          "transition-all duration-150 ease-out origin-top-right",
          open
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-[0.98] -translate-y-1 pointer-events-none",
        ].join(" ")}
      >
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={clickAndClose(onAccount)}
            className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition"
          >
            👤 계정 정보
          </button>

          <button
            type="button"
            onClick={clickAndClose(onSupport)}
            className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition"
          >
            🎫 고객센터
          </button>

          <button
            type="button"
            onClick={clickAndClose(onSettings)}
            className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition"
          >
            ⚙ 설정
          </button>

          <div className="h-px bg-zinc-800" />

          <button
            type="button"
            onClick={clickAndClose(onLogout)}
            className="w-full text-left px-4 py-2.5 text-sm text-red-300 hover:bg-zinc-800 transition"
          >
            🚪 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}