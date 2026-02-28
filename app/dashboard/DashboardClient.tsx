"use client";

import type { Application, ViewMode } from "../../lib/applications/types";
import { useDashboardController } from "../../components/dashboard/hooks/useDashboardController";
import { useMemo, useState } from "react";

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
import UpsellBanner from "@/components/billing/UpsellBanner";
import GraceBanner from "@/components/billing/GraceBanner";
import HardLimitGate from "@/components/billing/HardLimitGate";

const TAB_ITEMS: Array<{ key: ViewMode; label: string }> = [
  { key: "TODAY", label: "Today" },
  { key: "LIST", label: "List" },
  { key: "CALENDAR", label: "Calendar" },
  { key: "REPORT", label: "Report" },
];

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
        // Mobile tab button spacing
        "px-4 py-2 text-sm rounded-xl transition-all shrink-0",
        active
          ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent",
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
  page,
  limit,
  totalCount,
  initialGraceEndsAt,
}: {
  userId: string;
  userEmail: string;
  initialApplications: Application[];
  page: number;
  limit: number;
  totalCount: number;
  initialGraceEndsAt: string | null;
}) {
  const c = useDashboardController({ userId, userEmail, initialApplications });
  const router = useRouter();
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(20, limit);
  const total = Math.max(0, totalCount);
  const [portalLoading, setPortalLoading] = useState(false);
  const hasPrev = safePage > 1;
  const hasNext = safePage * safeLimit < total;
  const isFree = c.plan === "free";
  const isGrace = c.plan === "grace";
  const showSoftUpsell = isFree && total >= 80 && total < 95;
  const showStrongUpsell = isFree && total >= 95 && total < 100;
  const showHardLimitGate = isFree && total >= 100;
  const graceDaysLeft = useMemo(() => {
    if (!initialGraceEndsAt) return null;
    const endTs = new Date(initialGraceEndsAt).getTime();
    if (Number.isNaN(endTs)) return null;
    const diffMs = endTs - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [initialGraceEndsAt]);

  function pushPage(nextPage: number) {
    const p = Math.max(1, nextPage);
    router.push(`/dashboard?page=${p}&limit=${safeLimit}`);
    router.refresh();
  }

  function goPlanPage() {
    router.push("/dashboard/plan");
  }

  function goCleanupList() {
    c.setViewMode("LIST");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    c.pushToast({ tone: "default", message: "리스트 탭에서 정리할 항목을 확인해 보세요." });
  }

  async function openBillingPortal() {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const text = await res.text();
      let data: { ok?: boolean; url?: string; message?: string } | null = null;
      try {
        data = text ? (JSON.parse(text) as { ok?: boolean; url?: string; message?: string }) : null;
      } catch {
        data = null;
      }

      if (!res.ok || data?.ok !== true || !data?.url) {
        throw new Error(data?.message ?? "결제 관리 페이지로 이동하지 못했습니다.");
      }

      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제 관리 연결 중 오류가 발생했습니다.";
      c.pushToast({ tone: "error", message });
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="z-10">
        <AppHeader
          appName="Job Tracker"
          currentTab={c.viewMode}
          right={
            <>
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
          {/* Mobile horizontal scroll */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap -mx-1 px-1">
            {TAB_ITEMS.map((t) => (
              <TabButton key={t.key} active={c.viewMode === t.key} onClick={() => c.setViewMode(t.key)}>
                {t.label}
              </TabButton>
            ))}
          </div>
        </AppHeader>

        <div className="mt-6 h-px bg-zinc-900/60" />
      </header>

      {isGrace ? (
        <GraceBanner
          daysLeft={graceDaysLeft}
          portalLoading={portalLoading}
          onManageBilling={openBillingPortal}
          onViewPro={goPlanPage}
        />
      ) : null}

      {/* Mobile padding */}
      <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-sm text-zinc-400">
              {total === 0 ? "No applications yet" : `Page ${safePage} · ${total} total`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => pushPage(safePage - 1)}
                disabled={!hasPrev}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => pushPage(safePage + 1)}
                disabled={!hasNext}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {showSoftUpsell ? (
            <div className="mb-4">
              <UpsellBanner
                totalApplications={total}
                level="soft"
                onViewPro={goPlanPage}
                onUpgrade={goPlanPage}
                onCleanup={goCleanupList}
              />
            </div>
          ) : null}

          {showStrongUpsell ? (
            <div className="mb-4">
              <UpsellBanner
                totalApplications={total}
                level="strong"
                onViewPro={goPlanPage}
                onUpgrade={goPlanPage}
                onCleanup={goCleanupList}
              />
            </div>
          ) : null}

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
                  title="Calendar is empty"
                  description="Add applications with deadlines or follow-ups to see them on the calendar."
                  primary={{ label: "Add application", onClick: c.goToAddForm }}
                />
              </section>
            ) : (
              <section className="mt-6">
                <CalendarTab c={c} />
              </section>
            ))}

          {c.viewMode === "REPORT" && (
            <section className="mt-6">
              <ReportTab c={c} apps={c.apps} logs={c.logs} onOpenUpdates={() => c.setUpdatesOpen(true)} />
            </section>
          )}

          {showHardLimitGate ? (
            <section ref={c.addFormRef} className="mt-6">
              <HardLimitGate
                totalApplications={total}
                maxApplications={100}
                onViewPro={goPlanPage}
                onUpgrade={goPlanPage}
                onCleanup={goCleanupList}
              />
            </section>
          ) : (
            <AddFormSection c={c} />
          )}

          {c.viewMode === "LIST" && <ListTab c={c} />}

          <DetailDrawer c={c} />
        </div>
      </main>
    </div>
  );
}
