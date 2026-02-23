import React from "react";

// ===== Zero state card =====
export function ZeroStateCard({
  title,
  description,
  primary,
  secondary,
}: {
  title: string;
  description?: string;
  primary: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="text-lg font-semibold">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-zinc-400 leading-relaxed">{description}</div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={primary.onClick}
          className="px-4 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium hover:bg-zinc-200"
        >
          {primary.label}
        </button>

        {secondary ? (
          <button
            onClick={secondary.onClick}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700"
          >
            {secondary.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
