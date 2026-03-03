import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  active?: boolean;
  size?: "sm" | "md";
};

const sizeClassMap = {
  sm: "h-9 w-9 rounded-lg",
  md: "h-10 w-10 rounded-xl",
} as const;

export function IconButton({ icon, active = false, size = "md", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex items-center justify-center",
        sizeClassMap[size],
        "bg-zinc-800/70 hover:bg-zinc-700 active:scale-95 transition duration-150",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500/40",
        "disabled:opacity-40",
        active && "bg-indigo-600/20 ring-1 ring-indigo-500",
        className
      )}
      {...props}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
    </button>
  );
}
