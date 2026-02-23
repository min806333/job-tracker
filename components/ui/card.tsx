import { cn } from "@/lib/utils"

type Elevation = "base" | "hover" | "focus"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation
}

export function Card({ className, elevation = "base", ...props }: CardProps) {
  const elevationStyle = {
    base: "bg-zinc-800 border border-zinc-700",
    hover:
      "bg-zinc-800 border border-zinc-700 hover:border-zinc-600 hover:shadow-md transition-all",
    focus:
      "bg-zinc-800 border border-emerald-600 shadow-[0_0_0_1px_rgba(16,185,129,0.5)]",
  }

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all duration-200",
        elevationStyle[elevation],
        className
      )}
      {...props}
    />
  )
}