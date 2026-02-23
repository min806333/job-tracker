import * as React from "react"

type HeaderBarProps = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  leftAddon?: React.ReactNode
  right?: React.ReactNode
}

export function HeaderBar({ title, subtitle, leftAddon, right }: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-40">
      {/* L1 Header Layer */}
      <div className="bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/50">
        <div className="mx-auto w-full px-8 pt-6">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              {/* Left */}
              <div className="min-w-0 flex items-center gap-3">
                {leftAddon ? (
                  <div className="shrink-0">{leftAddon}</div>
                ) : null}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="truncate text-base font-semibold text-zinc-100">
                      {title}
                    </h1>
                  </div>

                  {subtitle ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-400">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Right */}
              {right ? (
                <div className="shrink-0 flex items-center gap-2">
                  {right}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* divider line to separate header from content */}
        <div className="h-px bg-zinc-900/60" />
      </div>
    </header>
  )
}