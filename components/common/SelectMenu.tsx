"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectMenuProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  buttonClassName?: string;
  menuClassName?: string;
  buttonTestId?: string;
  menuTestId?: string;
};

export default function SelectMenu({
  value,
  onChange,
  options,
  label,
  buttonClassName = "",
  menuClassName = "",
  buttonTestId,
  menuTestId,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0] ?? null,
    [options, value]
  );

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((prev) => !prev);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      {label ? <div className="mb-1 text-xs text-zinc-500">{label}</div> : null}

      <button
        ref={buttonRef}
        type="button"
        data-testid={buttonTestId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onButtonKeyDown}
        className={[
          "inline-flex min-h-10 min-w-[132px] items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100",
          "hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
          buttonClassName,
        ].join(" ")}
      >
        <span className="truncate">{selected?.label ?? "선택"}</span>
        <span className="text-xs text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          data-testid={menuTestId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className={[
            "absolute left-0 right-0 z-50 mt-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl",
            menuClassName,
          ].join(" ")}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const isDisabled = option.disabled === true;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                  isDisabled
                    ? "cursor-not-allowed opacity-40"
                    : "text-zinc-200 hover:bg-zinc-800/60",
                  isSelected ? "text-indigo-300" : "",
                ].join(" ")}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <span aria-hidden>✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
