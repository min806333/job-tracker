import * as React from "react"

type Props = {
  appName?: string
  currentTab: string
  right?: React.ReactNode
  children?: React.ReactNode
}

export function AppHeader({
  appName = "Job Tracker",
  currentTab,
  right,
  children,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl px-8 pt-6">
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800">
        {/* Top row */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 grid place-items-center shrink-0">
              🧭
            </div>

            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base font-semibold text-zinc-100">
                {appName}
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-sm text-zinc-400">{currentTab}</span>
            </div>
          </div>

          {right ? <div className="flex items-center gap-3">{right}</div> : null}
        </div>

        {/* Bottom row (Tabs slot) */}
        {children ? (
          <div className="border-t border-zinc-800 px-3 py-2">{children}</div>
        ) : null}
      </div>
    </div>
  )
}