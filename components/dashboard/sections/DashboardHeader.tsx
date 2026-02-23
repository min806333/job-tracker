"use client";

import type { DashboardController } from "../hooks/useDashboardController";

export function DashboardHeader({ c }: { c: DashboardController }) {
  const logsCount = c.logs.length;

  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Job Tracker</h1>
        <p className="text-sm text-gray-500">
          로그인: <span className="font-mono">{c.userEmail || c.userId}</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={c.reopenTutorial}
            title="튜토리얼(단축키: ?) "
          >
            튜토리얼
          </button>

          <button
            type="button"
            ref={c.updatesBtnRef}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => c.setUpdatesOpen(true)}
            title="업데이트 로그"
          >
            업데이트{logsCount ? ` (${logsCount})` : ""}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            c.viewMode === "TODAY" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
          }`}
          onClick={() => c.setViewMode("TODAY")}
          title="Today (단축키: g t)"
        >
          Today
        </button>

        <button
          type="button"
          ref={c.calendarTabRef}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            c.viewMode === "CALENDAR" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
          }`}
          onClick={() => c.setViewMode("CALENDAR")}
          title="Calendar (단축키: g c)"
        >
          Calendar
        </button>

        <button
          type="button"
          ref={c.listTabRef}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            c.viewMode === "LIST" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
          }`}
          onClick={() => c.setViewMode("LIST")}
          title="List (단축키: g l)"
        >
          리스트
        </button>

        <button
          type="button"
          ref={c.reportTabRef}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            c.viewMode === "REPORT" ? "bg-gray-900 text-white" : "hover:bg-gray-50"
          }`}
          onClick={() => c.setViewMode("REPORT")}
          title="Report (단축키: g r)"
        >
          리포트
        </button>
          <button
            type="button"
            onClick={() => c.setProfileMenuOpen(true)}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 hover:bg-zinc-900/50 transition"
            aria-label="메뉴 열기"
          >
            <span className="text-zinc-100 text-lg leading-none">≡</span>
          </button>
      </div>
    </header>
  );
}
