"use client";

export type ProductEventName =
  | "paywall_viewed"
  | "paywall_cta_clicked"
  | "upsell_cta_clicked"
  | "plan_pill_clicked"
  | "reason_badge_tooltip_shown"
  | "checkout_started"
  | "checkout_completed"
  | "billing_portal_opened"
  | "limit_reached"
  | "plan_comparison_viewed"
  | "plan_comparison_cta_clicked"
  | "today_section_viewed"
  | "later_section_toggled";

type ProductEventContextMap = {
  paywall_viewed: {
    reason: string;
    plan: string;
    counts?: Record<string, number>;
    stage?: string;
  };
  paywall_cta_clicked: {
    reason: string;
    cta: "upgrade" | "billing_portal" | "dismiss";
    plan: string;
  };
  upsell_cta_clicked: {
    from: "today_banner" | "paywall" | "plan_pill" | "plan_page";
    action: "primary" | "secondary" | "details";
    plan: string;
  };
  plan_pill_clicked: {
    plan: string;
    status: string;
  };
  reason_badge_tooltip_shown: {
    badge: string;
  };
  checkout_started: {
    price_id: string;
  };
  checkout_completed: Record<string, never>;
  billing_portal_opened: Record<string, never>;
  limit_reached: {
    limit_type: "applications";
    current: number;
    max: number;
  };
  plan_comparison_viewed: {
    variant: "full" | "compact";
    page: "plan" | "paywall" | "grace";
  };
  plan_comparison_cta_clicked: {
    action: "upgrade" | "manage";
    from: "plan" | "paywall" | "grace";
  };
  today_section_viewed: {
    range: "3d" | "7d";
    now_count: number;
    later_count: number;
  };
  later_section_toggled: {
    opened: boolean;
    later_count: number;
  };
};

type TrackOptions = {
  source?: "client" | "server";
};

export async function track<E extends ProductEventName>(
  eventName: E,
  context: ProductEventContextMap[E],
  options?: TrackOptions
): Promise<void> {
  try {
    const res = await fetch("/api/events/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        context,
        source: options?.source ?? "client",
      }),
    });

    if (!res.ok) {
      console.debug("[track] request failed", eventName, res.status);
    }
  } catch (error) {
    console.debug("[track] request error", eventName, error);
  }
}
