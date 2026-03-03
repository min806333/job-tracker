"use client";

import { useState } from "react";

export default function AdminPortalButton({
  userId,
  customerId,
}: {
  userId: string;
  customerId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, customerId }),
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { ok?: boolean; url?: string; message?: string }) : null;

      if (!res.ok || data?.ok !== true || !data?.url) {
        throw new Error(data?.message ?? "Failed to create billing portal link");
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open billing portal";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Open Billing Portal"}
      </button>
      {error ? <div className="text-[11px] text-red-300">{error}</div> : null}
    </div>
  );
}

