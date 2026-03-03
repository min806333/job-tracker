type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  size?: "sm" | "md";
};

const titleClassBySize = {
  sm: "text-base font-semibold tracking-tight text-zinc-100",
  md: "text-lg font-semibold tracking-tight text-zinc-100",
} as const;

const subtitleClassBySize = {
  sm: "mt-1 text-xs text-zinc-400",
  md: "mt-1 text-sm text-zinc-400",
} as const;

export function SectionHeader({ title, subtitle, right, size = "md" }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={titleClassBySize[size]}>{title}</h2>
        {subtitle ? <p className={subtitleClassBySize[size]}>{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
