"use client";

import type { Application } from "../../lib/applications/types";
import { useDashboardController } from "../../components/dashboard/hooks/useDashboardController";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { ToastViewport } from "../../components/dashboard/common/ToastViewport";
import { TutorialOverlay } from "../../components/dashboard/common/TutorialOverlay";
import { UpdatesDrawer } from "../../components/dashboard/common/UpdatesDrawer";
import { ZeroStateCard } from "../../components/dashboard/common/ZeroStateCard";
import ProfileMenuDrawer from "../../components/dashboard/profile/ProfileMenuDrawer";

import { PlanBadge } from "@/components/ui/PlanBadge";
import { UserMenu } from "@/components/ui/UserMenu";
import { AppHeader } from "@/components/ui/AppHeader";

import { AddFormSection } from "../../components/dashboard/sections/AddFormSection";
import { DetailDrawer } from "../../components/dashboard/sections/DetailDrawer";

import TodayTab from "../../components/dashboard/tabs/TodayTab";
import ListTab from "../../components/dashboard/tabs/ListTab";
import CalendarTab from "../../components/dashboard/tabs/CalendarTab";
import ReportTab from "../../components/dashboard/tabs/ReportTab";
import PaywallDrawer from "../../components/dashboard/paywall/PaywallDrawer";

const TAB_ITEMS = [
  { key: "TODAY", label: "Today" },
  { key: "LIST", label: "List" },
  { key: "CALENDAR", label: "Calendar" },
  { key: "REPORT", label: "Report" },
] as const;

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 text-xs rounded-lg transition-all",
        active
          ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function DashboardClient({
  userId,
  userEmail,
  initialApplications,
}: {
  userId: string;
  userEmail: string;
  initialApplications: Application[];
}) {
  const c = useDashboardController({ userId, userEmail, initialApplications });
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="z-10">
        <AppHeader
          appName="Job Tracker"
          currentTab={c.viewMode}
          right={
            <>
              {/* ✅ plan 단일 소스: c.plan 사용 (plan prop/중간변수 제거) */}
              {/* ✅ FREE 배지 클릭 시 paywall 여는 로직은 PlanBadge 내부에서 처리(권장) */}
              <div className="rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                <PlanBadge c={c} />
              </div>

              <UserMenu
                onAccount={() => router.push("/dashboard/account")}
                onSupport={() => router.push("/dashboard/support")}
                onSettings={() => router.push("/dashboard/settings")}
                onLogout={async () => {
                  try {
                    const supabase = createSupabaseBrowserClient();
                    await supabase.auth.signOut();
                    router.push("/login");
                    router.refresh();
                  } catch (e) {
                    console.error("logout failed", e);
                  }
                }}
              />
            </>
          }
        >
          <div className="flex items-center gap-2">
            {TAB_ITEMS.map((t) => (
              <TabButton
                key={t.key}
                active={c.viewMode === t.key}
                onClick={() => c.setViewMode(t.key as any)}
              >
                {t.label}
              </TabButton>
            ))}
          </div>
        </AppHeader>

        <div className="mt-6 h-px bg-zinc-900/60" />
      </header>

      <main className="px-8 py-8">
        <div className="mx-auto w-full max-w-6xl">
          <ProfileMenuDrawer c={c} />
          <PaywallDrawer c={c} />

          <ToastViewport toasts={c.toasts} onDismiss={c.dismissToast} />

          <TutorialOverlay
            open={c.tutorialOpen}
            steps={c.tutorialSteps}
            stepIndex={c.tutorialStep}
            onStepChange={c.setTutorialStep}
            onClose={() => c.setTutorialOpen(false)}
            onFinish={() => c.setTutorialOpen(false)}
          />

          <UpdatesDrawer
            open={c.updatesOpen}
            onClose={() => c.setUpdatesOpen(false)}
            logs={c.logs}
            onClear={c.clearLogs}
            onCopy={c.copyLogs}
            onOpenDetails={(id) => {
              c.setUpdatesOpen(false);
              c.openDetails(id);
            }}
          />

          {/* Content */}
          {c.viewMode === "TODAY" && <TodayTab c={c} />}

          {c.viewMode === "CALENDAR" &&
            (c.calendarApps.length === 0 ? (
              <section className="mt-6">
                <ZeroStateCard
                  title="캘린더가 비어 있어요"
                  description="마감/팔로업이 있는 지원서를 만들면 캘린더에서 드래그로 날짜 조정이 가능해요."
                  primary={{ label: "➕ 지원서 추가", onClick: c.goToAddForm }}
                />
              </section>
            ) : (
              <section className="mt-6">
                <CalendarTab c={c} />
              </section>
            ))}

          {c.viewMode === "REPORT" && (
            <section className="mt-6">
              <ReportTab
                c={c}
                apps={c.apps}
                logs={c.logs}
                onOpenUpdates={() => c.setUpdatesOpen(true)}
              />
            </section>
          )}

          <AddFormSection c={c} />

          {c.viewMode === "LIST" && <ListTab c={c} />}

          <DetailDrawer c={c} />
        </div>
      </main>
    </div>
  );
}