type EmptyStateProps = {
  title: string;
  description?: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  size?: "sm" | "md";
};

const shellClassBySize = {
  sm: "rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4",
  md: "rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5",
} as const;

const titleClassBySize = {
  sm: "text-sm font-semibold text-zinc-100",
  md: "text-base font-semibold text-zinc-100",
} as const;

const descriptionClassBySize = {
  sm: "mt-1 text-xs text-zinc-400",
  md: "mt-1 text-sm text-zinc-400",
} as const;

const buttonClassBySize = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2 text-sm",
} as const;

export function EmptyState({ title, description, primary, secondary, size = "md" }: EmptyStateProps) {
  return (
    <div className={shellClassBySize[size]}>
      <div className={titleClassBySize[size]}>{title}</div>
      {description ? <p className={descriptionClassBySize[size]}>{description}</p> : null}
      {primary || secondary ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {primary ? (
            <button
              type="button"
              onClick={primary.onClick}
              className={`rounded-xl border border-emerald-900/40 bg-emerald-950/30 font-medium text-emerald-200 hover:bg-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${buttonClassBySize[size]}`}
            >
              {primary.label}
            </button>
          ) : null}
          {secondary ? (
            <button
              type="button"
              onClick={secondary.onClick}
              className={`rounded-xl border border-zinc-700 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${buttonClassBySize[size]}`}
            >
              {secondary.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
