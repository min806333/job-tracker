import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PillTone = "neutral" | "success" | "pro";

type PillProps = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  asLinkHref?: string;
  tone?: PillTone;
  size?: "sm" | "md";
  className?: string;
  dataTestId?: string;
};

const toneClassMap: Record<PillTone, string> = {
  neutral: "",
  success: "",
  pro: "",
};

const baseClassName = "inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/60 transition";

const sizeClassMap = {
  sm: "h-8 gap-1.5 px-2.5 text-xs",
  md: "h-9 gap-2 px-3 text-sm",
} as const;

export function Pill({
  label,
  icon,
  onClick,
  asLinkHref,
  tone = "neutral",
  size = "md",
  className,
  dataTestId,
}: PillProps) {
  const interactive = Boolean(onClick || asLinkHref);
  const composedClassName = cn(
    baseClassName,
    sizeClassMap[size],
    toneClassMap[tone],
    interactive && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
    className
  );

  const content = (
    <>
      {icon ? (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      ) : null}
      <span className="leading-none">{label}</span>
    </>
  );

  if (asLinkHref) {
    return (
      <Link href={asLinkHref} className={composedClassName} data-testid={dataTestId}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={composedClassName} data-testid={dataTestId}>
        {content}
      </button>
    );
  }

  return <span className={composedClassName} data-testid={dataTestId}>{content}</span>;
}
