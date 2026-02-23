export function SupporterBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md border",
        "border-emerald-900/40 bg-emerald-950/30",
        "text-emerald-200",
        compact ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-xs",
      ].join(" ")}
      title="Supporter"
      aria-label="Supporter"
    >
      <span aria-hidden>💚</span>
      {!compact && <span className="font-medium">Supporter</span>}
    </span>
  )
}