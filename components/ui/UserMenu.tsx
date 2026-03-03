"use client";

import { useEffect, useRef, useState } from "react";

function MenuAction({
  title,
  description,
  onClick,
  danger,
}: {
  title: string;
  description?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-2.5 text-left transition hover:bg-zinc-800/60"
    >
      <div className={danger ? "text-sm text-red-300" : "text-sm text-zinc-200"}>{title}</div>
      {description ? <div className="mt-0.5 text-xs text-zinc-500">{description}</div> : null}
    </button>
  );
}

export function UserMenu({
  isAdmin,
  onAccount,
  onAdmin,
  onSupport,
  onSettings,
  onLogout,
}: {
  isAdmin?: boolean;
  onAccount?: () => void;
  onAdmin?: () => void;
  onSupport?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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
        onClick={() => setOpen((prev) => !prev)}
        className="grid h-9 w-9 place-items-center rounded-full border border-zinc-700 bg-zinc-800 transition-all hover:bg-zinc-700"
        aria-label="메뉴"
        title="메뉴"
      >
        <span className="text-xs text-zinc-300">☰</span>
      </button>

      <div
        className={[
          "absolute right-0 z-50 mt-2 w-56",
          "origin-top-right transition-all duration-150 ease-out",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-lg">
          <MenuAction title="계정 상세 정보" onClick={clickAndClose(onAccount)} />
          {isAdmin ? (
            <MenuAction
              title="관리자 콘솔"
              description="문의/구독 상태 확인"
              onClick={clickAndClose(onAdmin)}
            />
          ) : null}
          <MenuAction title="고객센터" onClick={clickAndClose(onSupport)} />
          <MenuAction title="설정" onClick={clickAndClose(onSettings)} />
          <div className="h-px bg-zinc-800" />
          <MenuAction title="로그아웃" danger onClick={clickAndClose(onLogout)} />
        </div>
      </div>
    </div>
  );
}
