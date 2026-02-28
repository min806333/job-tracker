"use client";

import { useMemo, useState } from "react";

type Plan = "free" | "pro" | "grace";

type Row = {
  userId: string;
  subscriptionId: string;
  currentPlan: Plan;
};

type CheckResult = {
  status: string | null;
  expected_plan: Plan;
  current_plan: Plan;
  matches: boolean;
};

function safeJson(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function PlanMismatchClient({ rows }: { rows: Row[] }) {
  const [state, setState] = useState<
    Record<
      string,
      { loading: boolean; error?: string | null; result?: CheckResult | null; resyncing?: boolean }
    >
  >({});

  const mismatches = useMemo(() => {
    return rows
      .map((row) => {
        const item = state[row.subscriptionId];
        if (!item?.result || item.result.matches) return null;
        return { row, result: item.result };
      })
      .filter(Boolean) as { row: Row; result: CheckResult }[];
  }, [rows, state]);

  async function runCheck(row: Row) {
    setState((prev) => ({
      ...prev,
      [row.subscriptionId]: { loading: true },
    }));

    try {
      const res = await fetch("/api/admin/subscriptions/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: row.subscriptionId, userId: row.userId }),
      });
      const text = await res.text();
      const data = safeJson(text) as
        | { ok?: boolean; message?: string } & Partial<CheckResult>
        | null;

      if (!res.ok || !data || data.ok !== true) {
        throw new Error(data?.message ?? (text.trim() || "확인에 실패했습니다."));
      }

      setState((prev) => ({
        ...prev,
        [row.subscriptionId]: { loading: false, result: data as CheckResult },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "확인 중 오류가 발생했습니다.";
      setState((prev) => ({
        ...prev,
        [row.subscriptionId]: { loading: false, error: message },
      }));
    }
  }

  async function runResync(row: Row) {
    setState((prev) => ({
      ...prev,
      [row.subscriptionId]: { ...(prev[row.subscriptionId] ?? {}), resyncing: true },
    }));

    try {
      const res = await fetch("/api/admin/subscriptions/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: row.subscriptionId, userId: row.userId }),
      });
      const text = await res.text();
      const data = safeJson(text) as
        | { ok?: boolean; message?: string; plan?: Plan; status?: string | null }
        | null;

      if (!res.ok || !data || data.ok !== true) {
        throw new Error(data?.message ?? (text.trim() || "재동기화에 실패했습니다."));
      }

      setState((prev) => ({
        ...prev,
        [row.subscriptionId]: {
          loading: false,
          resyncing: false,
          result: {
            status: data.status ?? null,
            expected_plan: data.plan ?? "free",
            current_plan: data.plan ?? "free",
            matches: true,
          },
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "재동기화 중 오류가 발생했습니다.";
      setState((prev) => ({
        ...prev,
        [row.subscriptionId]: { ...(prev[row.subscriptionId] ?? {}), resyncing: false, error: message },
      }));
    }
  }

  return (
    <div className="mt-8 grid gap-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Plan Check Queue</div>
          <div className="text-xs text-zinc-500">Stripe subscription present</div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-500">No subscriptions to check.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-zinc-500">
                <tr className="text-left">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Subscription</th>
                  <th className="py-2 pr-4">Profile Plan</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Expected</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {rows.map((row) => {
                  const item = state[row.subscriptionId];
                  const result = item?.result ?? null;
                  return (
                    <tr key={row.subscriptionId}>
                      <td className="py-2 pr-4 text-xs text-zinc-500">{row.userId}</td>
                      <td className="py-2 pr-4">{row.subscriptionId}</td>
                      <td className="py-2 pr-4">{row.currentPlan}</td>
                      <td className="py-2 pr-4">{result?.status ?? "-"}</td>
                      <td className="py-2 pr-4">{result?.expected_plan ?? "-"}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void runCheck(row)}
                            disabled={item?.loading}
                            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-50"
                          >
                            {item?.loading ? "확인 중..." : "Check"}
                          </button>
                          {result && !result.matches ? (
                            <button
                              type="button"
                              onClick={() => void runResync(row)}
                              disabled={item?.resyncing}
                              className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-1 text-xs text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
                            >
                              {item?.resyncing ? "동기화 중..." : "Resync plan"}
                            </button>
                          ) : null}
                          {item?.error ? (
                            <span className="text-xs text-red-300">{item.error}</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Plan Mismatches</div>
          <div className="text-xs text-zinc-500">Expected vs profiles.plan</div>
        </div>

        {mismatches.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-500">No mismatches detected yet.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-zinc-500">
                <tr className="text-left">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Subscription</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Profile Plan</th>
                  <th className="py-2 pr-4">Expected Plan</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {mismatches.map(({ row, result }) => {
                  const item = state[row.subscriptionId];
                  return (
                    <tr key={`mm-${row.subscriptionId}`}>
                      <td className="py-2 pr-4 text-xs text-zinc-500">{row.userId}</td>
                      <td className="py-2 pr-4">{row.subscriptionId}</td>
                      <td className="py-2 pr-4">{result.status ?? "-"}</td>
                      <td className="py-2 pr-4">{result.current_plan}</td>
                      <td className="py-2 pr-4">{result.expected_plan}</td>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={() => void runResync(row)}
                          disabled={item?.resyncing}
                          className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-1 text-xs text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
                        >
                          {item?.resyncing ? "동기화 중..." : "Resync plan"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
