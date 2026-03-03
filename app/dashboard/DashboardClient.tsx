"use client";

import type { Application, ViewMode } from "../../lib/applications/types";
import { useDashboardController } from "../../components/dashboard/hooks/useDashboardController";
import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { ToastViewport } from "../../components/dashboard/common/ToastViewport";
import { TutorialOverlay } from "../../components/dashboard/common/TutorialOverlay";
import { UpdatesDrawer } from "../../components/dashboard/common/UpdatesDrawer";
import { ZeroStateCard } from "../../components/dashboard/common/ZeroStateCard";
import ProfileMenuDrawer from "../../components/dashboard/profile/ProfileMenuDrawer";

import { Pill } from "@/components/common/Pill";
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
import { track } from "@/lib/analytics/track";
import GraceCountdownDrawer from "@/components/billing/GraceCountdownDrawer";

const FREE_MAX_APPS = 100;
const UPSELL_KEY_80 = "upsell_shown_80";
const UPSELL_KEY_95 = "upsell_shown_95";
const LIMIT_REACHED_LOGGED_DATE_KEY = "limit_reached_logged_date";

const TAB_ITEMS: Array<{ key: ViewMode; label: string }> = [
  { key: "TODAY", label: "오늘 집중" },
  { key: "LIST", label: "목록" },
  { key: "CALENDAR", label: "캘린더" },
  { key: "REPORT", label: "리포트" },
];

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35 10.55 20C5.4 15.2 2 12.03 2 8.15 2 5 4.42 2.6 7.5 2.6c1.74 0 3.4.82 4.5 2.1 1.1-1.28 2.76-2.1 4.5-2.1 3.08 0 5.5 2.4 5.5 5.55 0 3.88-3.4 7.05-8.55 11.85L12 21.35Z" />
    </svg>
  );
}

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
  initialPlan,
  initialIsAdmin,
}: {
  userId: string;
  userEmail: string;
  initialApplications: Application[];
  page: number;
  limit: number;
  totalCount: number;
  initialGraceEndsAt: string | null;
  initialPlan: "free" | "pro" | "grace";
  initialIsAdmin: boolean;
}) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [graceModalOpen, setGraceModalOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showSoftUpsell, setShowSoftUpsell] = useState(false);
  const [showStrongUpsell, setShowStrongUpsell] = useState(false);
  const [mobileIdentityExpanded, setMobileIdentityExpanded] = useState(false);
  const [planStatus, setPlanStatus] = useState("active");
  const graceDaysLeft = useMemo(() => {
    if (!initialGraceEndsAt) return null;
    const endDate = new Date(initialGraceEndsAt);
    if (Number.isNaN(endDate.getTime())) return null;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const diffMs = endStart.getTime() - todayStart.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [initialGraceEndsAt]);

  const c = useDashboardController({ userId, userEmail, initialApplications });
  const router = useRouter();
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(20, limit);
  const totalForPaging = Math.max(0, totalCount);
  const totalVisible = c.apps.length;
  const hasPrev = safePage > 1;
  const hasNext = safePage * safeLimit < totalForPaging;
  const isFree = c.plan === "free";
  const isGracePlan = c.plan === "grace" || initialPlan === "grace";
  const isSoftLockByGrace = isGracePlan && graceDaysLeft !== null && graceDaysLeft <= 0;
  const showGraceBanner = isGracePlan && graceDaysLeft !== null && graceDaysLeft <= 7 && graceDaysLeft > 3;
  const showGraceModal = isGracePlan && graceDaysLeft !== null && graceDaysLeft <= 3 && graceDaysLeft > 0;
  const showHardLimitGate = isFree && totalVisible >= FREE_MAX_APPS;
  const usageRatio = FREE_MAX_APPS > 0 ? totalVisible / FREE_MAX_APPS : 0;
  const showSoftUpsellNow = showSoftUpsell && isFree && usageRatio >= 0.8 && usageRatio < 0.95;
  const showStrongUpsellNow = showStrongUpsell && isFree && usageRatio >= 0.95 && usageRatio < 1;
  const checkoutPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "unknown";
  const planStatusLabel = useMemo(() => {
    if (c.planLoading) return "로딩 중";
    const status = planStatus.toLowerCase();
    if (status === "active") return "이용 중";
    if (status === "trialing") return "체험 중";
    if (status === "grace") return "결제 확인 필요";
    if (status === "free") return "무료";
    return "이용 중";
  }, [c.planLoading, planStatus]);
  const isBillingIssue = useMemo(() => {
    const status = planStatus.toLowerCase();
    return c.plan === "grace" || status === "grace" || status === "past_due" || status === "unpaid" || status === "incomplete";
  }, [c.plan, planStatus]);
  const planPillLabel = useMemo(() => {
    if (isBillingIssue) return "결제 확인 필요";
    if (c.plan === "free") return "요금제 무료 · 제한 있음";
    if (c.plan === "pro") return `요금제 Pro · ${planStatusLabel}`;
    return `요금제 ${c.plan.toUpperCase()} · ${planStatusLabel}`;
  }, [c.plan, isBillingIssue, planStatusLabel]);
  const supporterLabel = c.plan === "pro" ? "Supporter" : "FREE";
  const mobilePlanPillLabel = useMemo(() => {
    if (isBillingIssue) return "결제 확인";
    if (c.plan === "pro") return "Pro";
    return "Free";
  }, [c.plan, isBillingIssue]);

  const normalizedPaywallReason = (c.paywallReason || "generic")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, 64);

  useEffect(() => {
    try {
      setShowOnboarding(localStorage.getItem("onboarding_seen") !== "1");
    } catch {
      setShowOnboarding(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPlanStatus() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from("profiles")
          .select("plan_status, is_admin")
          .eq("id", userId)
          .single();
        if (!mounted) return;
        setPlanStatus((data?.plan_status as string | null | undefined) ?? "active");
      } catch {
        if (!mounted) return;
        setPlanStatus("active");
      }
    }

    void loadPlanStatus();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!c.paywallOpen) return;
    const reason = normalizedPaywallReason || "generic";
    const key = `evt_paywall_viewed_${reason}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {}
    void track("paywall_viewed", {
      reason,
      plan: c.plan,
      counts: { applications: totalVisible },
      stage: c.viewMode.toLowerCase(),
    });
  }, [c.paywallOpen, c.plan, c.viewMode, normalizedPaywallReason, totalVisible]);

  useEffect(() => {
    if (!isFree || usageRatio < 0.8 || usageRatio >= 0.95) return;
    let shouldShow = false;
    try {
      shouldShow = localStorage.getItem(UPSELL_KEY_80) !== "1";
      if (shouldShow) localStorage.setItem(UPSELL_KEY_80, "1");
    } catch {
      shouldShow = true;
    }
    if (!shouldShow) return;
    setShowSoftUpsell(true);
    c.pushToast({
      tone: "default",
      message: `현재 ${totalVisible}/${FREE_MAX_APPS}건이에요. 자동 정리와 우선순위 기능으로 더 효율적으로 관리해보세요.`,
      durationMs: 3200,
    });
    void track("paywall_viewed", {
      reason: "free_limit_80",
      plan: c.plan,
      counts: { applications: totalVisible },
      stage: "banner",
    });
  }, [c, c.plan, isFree, totalVisible, usageRatio]);

  useEffect(() => {
    if (!isFree || usageRatio < 0.95 || usageRatio >= 1) return;
    let shouldShow = false;
    try {
      shouldShow = localStorage.getItem(UPSELL_KEY_95) !== "1";
      if (shouldShow) localStorage.setItem(UPSELL_KEY_95, "1");
    } catch {}
    if (!shouldShow) return;
    setShowStrongUpsell(true);
    void track("paywall_viewed", {
      reason: "free_limit_95",
      plan: c.plan,
      counts: { applications: totalVisible },
      stage: "banner",
    });
  }, [c.plan, isFree, totalVisible, usageRatio]);

  useEffect(() => {
    if (!showHardLimitGate) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    let shouldLogLimitReached = false;
    try {
      const loggedDate = localStorage.getItem(LIMIT_REACHED_LOGGED_DATE_KEY);
      shouldLogLimitReached = loggedDate !== todayKey;
      if (shouldLogLimitReached) localStorage.setItem(LIMIT_REACHED_LOGGED_DATE_KEY, todayKey);
    } catch {}
    void track("paywall_viewed", {
      reason: "free_limit_100",
      plan: c.plan,
      counts: { applications: totalVisible },
      stage: "gate",
    });
    if (shouldLogLimitReached) {
      void track("limit_reached", {
        limit_type: "applications",
        current: totalVisible,
        max: FREE_MAX_APPS,
      });
    }
  }, [c.plan, showHardLimitGate, totalVisible]);

  useEffect(() => {
    if (!showGraceBanner) return;
    const key = "evt_paywall_viewed_grace_banner";
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {}
    void track("paywall_viewed", {
      reason: "grace_countdown_banner",
      plan: c.plan,
      counts: { applications: totalVisible },
      stage: "banner",
    });
  }, [c.plan, showGraceBanner, totalVisible]);

  useEffect(() => {
    if (!showGraceModal) return;
    const modalKey = `evt_grace_modal_seen_${initialGraceEndsAt ?? "unknown"}`;
    try {
      if (sessionStorage.getItem(modalKey) === "1") return;
      sessionStorage.setItem(modalKey, "1");
    } catch {}
    setGraceModalOpen(true);
    void track("paywall_viewed", {
      reason: "grace_countdown_modal",
      plan: c.plan,
      counts: { applications: totalVisible },
      stage: "drawer",
    });
  }, [c.plan, initialGraceEndsAt, showGraceModal, totalVisible]);

  useEffect(() => {
    if (!isSoftLockByGrace) return;
    const key = "evt_paywall_viewed_grace_softlock";
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {}
    void track("paywall_viewed", {
      reason: "grace_softlock",
      plan: c.plan,
      counts: { applications: totalVisible },
      stage: "gate",
    });
  }, [c.plan, isSoftLockByGrace, totalVisible]);

  function pushPage(nextPage: number) {
    const p = Math.max(1, nextPage);
    router.push(`/dashboard?page=${p}&limit=${safeLimit}`);
    router.refresh();
  }

  function goPlanPage(withCompareHash = false) {
    router.push(withCompareHash ? "/dashboard/plan#compare" : "/dashboard/plan");
  }

  function trackUpsellCta(from: "today_banner" | "paywall" | "plan_pill" | "plan_page", action: "primary" | "secondary" | "details") {
    void track("upsell_cta_clicked", { from, action, plan: c.plan });
  }

  function trackUpgradeCta(reason: string) {
    void track("paywall_cta_clicked", {
      reason,
      cta: "upgrade",
      plan: c.plan,
    });
  }

  function onPlanPillClick() {
    const status = planStatus.toLowerCase();
    void track("plan_pill_clicked", { plan: c.plan, status });
    void trackUpsellCta("plan_pill", "primary");
    if (isBillingIssue) {
      void openBillingPortal("plan_pill");
      return;
    }
    goPlanPage();
  }

  function openQuickAddFromMobileBar() {
    if (c.viewMode !== "TODAY") c.setViewMode("TODAY");
    c.setQuickOpen(true);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function openListFiltersFromMobileBar() {
    c.setViewMode("LIST");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function goCleanupList() {
    c.setViewMode("LIST");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    c.pushToast({ tone: "default", message: "목록 탭으로 이동했어요. 필터와 정렬로 빠르게 정리해보세요." });
  }

  async function openBillingPortal(reason: string) {
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
        throw new Error(data?.message ?? "결제 관리 페이지를 열 수 없어요.");
      }

      void track("paywall_cta_clicked", {
        reason,
        cta: "billing_portal",
        plan: c.plan,
      });
      void track("billing_portal_opened", {});
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제 관리 연결 중 오류가 발생했어요.";
      c.pushToast({ tone: "error", message });
    } finally {
      setPortalLoading(false);
    }
  }

  async function startCheckout(reason: string) {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      void track("paywall_cta_clicked", {
        reason,
        cta: "upgrade",
        plan: c.plan,
      });
      void track("checkout_started", { price_id: checkoutPriceId });

      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { url?: string; error?: string }) : null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "결제 페이지로 이동하지 못했어요.");
      }
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "업그레이드 처리 중 오류가 발생했어요.";
      c.pushToast({ tone: "error", message });
    } finally {
      setCheckoutLoading(false);
    }
  }

  function dismissGraceModal() {
    void track("paywall_cta_clicked", {
      reason: "grace_countdown_modal",
      cta: "dismiss",
      plan: c.plan,
    });
    setGraceModalOpen(false);
  }

  function dismissOnboarding() {
    setShowOnboarding(false);
    try {
      localStorage.setItem("onboarding_seen", "1");
    } catch {}
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="z-10">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:hidden">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-base font-semibold text-zinc-100">오늘 집중</h1>
              <div className="flex items-center gap-2">
                {initialIsAdmin ? (
                  <Pill
                    size="sm"
                    label="관리자"
                    tone="neutral"
                    asLinkHref="/admin/support"
                    dataTestId="admin-pill-mobile"
                  />
                ) : null}
                <Pill
                  size="sm"
                  label={mobilePlanPillLabel}
                  tone="neutral"
                  onClick={onPlanPillClick}
                  dataTestId="plan-pill-mobile"
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMobileIdentityExpanded((prev) => !prev)}
                className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-1.5 text-left text-xs text-zinc-400"
                aria-expanded={mobileIdentityExpanded}
                title="사용자 정보 펼치기/접기"
              >
                <span
                  className={
                    mobileIdentityExpanded
                      ? "block break-all whitespace-normal text-zinc-300"
                      : "block overflow-hidden text-ellipsis whitespace-nowrap text-zinc-300"
                  }
                >
                  {mobileIdentityExpanded ? `${userEmail} · ${userId}` : userEmail || userId}
                </span>
              </button>

              <button
                type="button"
                onClick={() => c.setProfileMenuOpen(true)}
                className="h-8 w-8 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-200"
                aria-label="메뉴 열기"
              >
                ☰
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto whitespace-nowrap -mx-1 px-1">
              {TAB_ITEMS.map((t) => (
                <TabButton key={`m-${t.key}`} active={c.viewMode === t.key} onClick={() => c.setViewMode(t.key)}>
                  {t.label}
                </TabButton>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden sm:block">
          <AppHeader
            appName="Job Tracker"
            currentTab={c.viewMode}
            right={
              <>
                <div className="flex items-center gap-2">
                  <Pill
                    label={supporterLabel}
                    icon={c.plan === "pro" ? <HeartIcon /> : undefined}
                    tone="pro"
                    onClick={c.plan === "pro" ? undefined : () => c.setPaywallOpen(true)}
                  />
                  {initialIsAdmin ? (
                    <Pill
                      label="관리자"
                      tone="neutral"
                      asLinkHref="/admin/support"
                      dataTestId="admin-pill-desktop"
                    />
                  ) : null}
                  <Pill label={planPillLabel} tone="neutral" onClick={onPlanPillClick} dataTestId="plan-pill-desktop" />
                </div>

                <UserMenu
                  isAdmin={initialIsAdmin}
                  onAccount={() => router.push("/dashboard/account")}
                  onAdmin={() => router.push("/admin")}
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
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap -mx-1 px-1">
              {TAB_ITEMS.map((t) => (
                <TabButton key={t.key} active={c.viewMode === t.key} onClick={() => c.setViewMode(t.key)}>
                  {t.label}
                </TabButton>
              ))}
            </div>
          </AppHeader>
        </div>

        <div className="mt-4 h-px bg-zinc-900/60 sm:mt-6" />
      </header>

      {showGraceBanner ? (
        <GraceBanner
          daysLeft={graceDaysLeft}
          portalLoading={portalLoading}
          checkoutLoading={checkoutLoading}
          onManageBilling={() => openBillingPortal("grace_countdown_banner")}
          onUpgrade={() => {
            void startCheckout("grace_countdown_banner");
          }}
        />
      ) : null}

      <GraceCountdownDrawer
        open={graceModalOpen}
        daysLeft={graceDaysLeft ?? 0}
        portalLoading={portalLoading}
        checkoutLoading={checkoutLoading}
        onClose={dismissGraceModal}
        onManageBilling={() => void openBillingPortal("grace_countdown_modal")}
        onUpgrade={() => void startCheckout("grace_countdown_modal")}
      />

      {/* Mobile padding */}
      <main className="px-4 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">
          {showOnboarding ? (
            <section className="mb-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-100">처음이라면 이렇게 시작해보세요</h2>
                  <div className="mt-2 space-y-1 text-sm text-zinc-300">
                    <div>1) 지원 항목 추가</div>
                    <div>2) 단계와 마감일 설정</div>
                    <div>3) 오늘 집중 목록 처리</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissOnboarding}
                  className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-800/70 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                  aria-label="온보딩 닫기"
                >
                  닫기
                </button>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={dismissOnboarding}
                  className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40"
                >
                  시작하기
                </button>
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-sm text-zinc-400">
              전체 항목 {totalVisible}건
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => pushPage(safePage - 1)}
                disabled={!hasPrev}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => pushPage(safePage + 1)}
                disabled={!hasNext}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>

          {showSoftUpsellNow ? (
            <div className="mb-4">
              <UpsellBanner
                totalApplications={totalVisible}
                level="soft"
                onViewPro={() => {
                  trackUpgradeCta("upsell_soft_view_pro");
                  trackUpsellCta("today_banner", "details");
                  goPlanPage(true);
                }}
                onUpgrade={() => {
                  trackUpgradeCta("upsell_soft_upgrade");
                  trackUpsellCta("today_banner", "primary");
                  goPlanPage();
                }}
                onCleanup={() => {
                  trackUpsellCta("today_banner", "secondary");
                  goCleanupList();
                }}
              />
            </div>
          ) : null}

          {showStrongUpsellNow ? (
            <div className="mb-4">
              <UpsellBanner
                totalApplications={totalVisible}
                level="strong"
                onViewPro={() => {
                  trackUpgradeCta("upsell_strong_view_pro");
                  trackUpsellCta("today_banner", "details");
                  goPlanPage(true);
                }}
                onUpgrade={() => {
                  trackUpgradeCta("upsell_strong_upgrade");
                  trackUpsellCta("today_banner", "primary");
                  goPlanPage();
                }}
                onCleanup={() => {
                  trackUpsellCta("today_banner", "secondary");
                  goCleanupList();
                }}
              />
            </div>
          ) : null}

          <ProfileMenuDrawer c={c} isAdmin={initialIsAdmin} />
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
                  description="마감일이나 팔로업 일정이 있는 항목을 추가하면 캘린더에서 바로 확인할 수 있어요."
                  primary={{ label: "항목 추가", onClick: c.goToAddForm }}
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

          {isSoftLockByGrace ? (
            <section className="mt-6 rounded-2xl border border-amber-800/50 bg-amber-950/20 p-5">
              <div className="text-base font-semibold text-amber-100">읽기 전용 모드가 시작되었어요.</div>
              <div className="mt-2 text-sm text-zinc-300 leading-relaxed">
                데이터는 그대로 유지되고 목록 조회는 계속 가능합니다. 결제 정보를 업데이트하면
                추가/수정 기능을 다시 사용할 수 있어요.
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void openBillingPortal("grace_softlock")}
                  disabled={portalLoading}
                  className="rounded-xl border border-amber-700/60 bg-amber-900/40 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-900/60 disabled:opacity-60"
                >
                  {portalLoading ? "결제 관리 접속 중..." : "결제 수단 업데이트"}
                </button>
                <button
                  type="button"
                  onClick={() => void startCheckout("grace_softlock")}
                  disabled={checkoutLoading}
                  className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-60"
                >
                  {checkoutLoading ? "결제 페이지 이동 중..." : "Pro 업그레이드"}
                </button>
              </div>
            </section>
          ) : showHardLimitGate ? (
            <section ref={c.addFormRef} className="mt-6">
              <HardLimitGate
                totalApplications={totalVisible}
                maxApplications={FREE_MAX_APPS}
                onViewPro={() => {
                  trackUpgradeCta("hard_limit_view_pro");
                  trackUpsellCta("today_banner", "details");
                  goPlanPage(true);
                }}
                onUpgrade={() => {
                  trackUpgradeCta("hard_limit_upgrade");
                  trackUpsellCta("today_banner", "primary");
                  goPlanPage();
                }}
                onCleanup={() => {
                  trackUpsellCta("today_banner", "secondary");
                  goCleanupList();
                }}
              />
            </section>
          ) : (
            <AddFormSection c={c} readOnly={isSoftLockByGrace} />
          )}

          {c.viewMode === "LIST" && <ListTab c={c} />}

          <DetailDrawer c={c} readOnly={isSoftLockByGrace} />
        </div>
      </main>

      <div
        data-testid="mobile-bottom-bar"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur sm:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="mobile-quick-add-button"
            onClick={openQuickAddFromMobileBar}
            className="rounded-xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-sm font-medium text-emerald-200"
          >
            빠른 추가
          </button>
          <button
            type="button"
            data-testid="mobile-filter-sort-button"
            onClick={openListFiltersFromMobileBar}
            className="rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200"
          >
            필터/정렬
          </button>
        </div>
      </div>
    </div>
  );
}







