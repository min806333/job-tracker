"use client";

import React, { useMemo } from "react";
import type { DashboardController } from "../hooks/useDashboardController";
import type { Application, ActivityLog } from "../../../lib/applications/types";
import { STAGES } from "../../../lib/applications/types";
import { isActiveStage } from "../../../lib/applications/selectors";

// ===== Report View (분석/리포트) =====
function MiniBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total <= 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-500">
          {value} · {pct}%
        </div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-zinc-900 overflow-hidden">
        <div className="h-full bg-zinc-950/60" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  // CSV 기본 이스케이프: 따옴표는 두 번, 쉼표/줄바꿈/따옴표 포함 시 전체를 따옴표로 감쌈
  const needs = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export default function ReportTab({
  c,
  apps,
  logs,
  onOpenUpdates,
}: {
  c: DashboardController;
  apps: Application[];
  logs: ActivityLog[];
  onOpenUpdates: () => void;
}) {
  const total = apps.length;
  const active = apps.filter((a) => isActiveStage(a.stage));
  const activeCount = active.length;

  const isPro = c.plan === "pro";

  const stageCounts = useMemo(() => {
    const acc = STAGES.reduce<Record<string, number>>((m, s) => {
      m[s.value] = 0;
      return m;
    }, {});
    for (const a of apps) acc[a.stage] = (acc[a.stage] ?? 0) + 1;
    return acc;
  }, [apps]);

  const sourceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of apps) {
      const s = (a.source ?? "").trim();
      if (!s) continue;
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  }, [apps]);

  const funnel = useMemo(() => {
    const f = {
      saved: 0,
      applying: 0,
      applied: 0,
      test: 0,
      interview: 0,
      offer: 0,
      rejectedOrWithdrawn: 0,
      archived: 0,
    };
    for (const a of apps) {
      switch (a.stage) {
        case "SAVED":
          f.saved++;
          break;
        case "APPLYING":
          f.applying++;
          break;
        case "APPLIED":
          f.applied++;
          break;
        case "TEST":
          f.test++;
          break;
        case "INTERVIEW":
          f.interview++;
          break;
        case "OFFER":
          f.offer++;
          break;
        case "REJECTED":
        case "WITHDRAWN":
          f.rejectedOrWithdrawn++;
          break;
        case "ARCHIVED":
          f.archived++;
          break;
      }
    }
    return f;
  }, [apps]);

  // ✅ 전환율 (간단)
  const interviewRate = useMemo(() => {
    const denom = funnel.applied + funnel.test;
    const pct = denom > 0 ? (funnel.interview / denom) * 100 : 0;
    return { pct: clampPct(pct), num: funnel.interview, denom };
  }, [funnel]);

  const offerRate = useMemo(() => {
    const denom = funnel.interview;
    const pct = denom > 0 ? (funnel.offer / denom) * 100 : 0;
    return { pct: clampPct(pct), num: funnel.offer, denom };
  }, [funnel]);

  // ✅ 최근 30일 활동량 (logs 기반)
  const activity30 = useMemo(() => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = logs.filter((l) => {
      const t = new Date(l.ts).getTime();
      return Number.isFinite(t) && t >= since;
    });

    const created = recent.filter((l) => l.type === "CREATE").length;
    const stageChanged = recent.filter((l) => l.type === "STAGE").length;
    const doneLike = recent.filter((l) => l.type === "UPDATE" && /완료|done/i.test(l.message)).length;

    // “활동 점수(가벼운 지표)” 느낌
    const score = created * 3 + stageChanged * 2 + doneLike;

    return { created, stageChanged, doneLike, score, totalLogs: recent.length };
  }, [logs]);

  const onExportCsv = () => {
    if (!isPro) {
      c.setPaywallOpen(true);
      return;
    }

    // CSV 컬럼은 필요 최소로. (나중에 확장 가능)
    const headers = [
      "company",
      "role",
      "stage",
      "deadline",
      "followup_at",
      "next_action",
      "source",
      "url",
      "created_at",
      "updated_at",
    ];

    const rows = apps.map((a: any) => [
      csvEscape(a.company),
      csvEscape(a.role),
      csvEscape(a.stage),
      csvEscape(a.deadline ?? ""),
      csvEscape(a.followup_at ?? ""),
      csvEscape(a.next_action ?? ""),
      csvEscape(a.source ?? ""),
      csvEscape(a.url ?? ""),
      csvEscape(a.created_at ?? ""),
      csvEscape(a.updated_at ?? ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `job-tracker-export-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    downloadTextFile(filename, csv);
  };

  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-zinc-400">Report</div>
            <div className="text-xl font-semibold">분석 / 리포트</div>
            <div className="mt-2 text-sm text-zinc-400 leading-relaxed">
              지원 현황을 한 번에 보고, 최근 업데이트 로그로 “내가 무엇을 했는지” 추적할 수 있어요.
            </div>

            {!isPro ? (
              <div className="mt-3 text-sm text-zinc-400">
                💚 Supporter는{" "}
                <span className="text-zinc-200 font-semibold">CSV 내보내기</span>
                를 사용할 수 있어요.
                <span className="ml-2 text-xs text-zinc-500">
                  (내 데이터는 내 것 → 백업/분석 가능)
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={onOpenUpdates}
              className="px-4 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 font-medium text-sm"
            >
              최근 업데이트 열기
            </button>

            <button
              onClick={onExportCsv}
              className={[
                "px-4 py-2 rounded-xl text-sm font-medium transition",
                isPro
                  ? "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-zinc-950/40 border border-zinc-800 text-zinc-400 hover:bg-zinc-950/60",
              ].join(" ")}
              title={isPro ? "CSV로 내보내기" : "Supporter 전용 기능"}
              aria-label={isPro ? "CSV로 내보내기" : "Supporter 전용 기능"}
            >
              ⬇️ CSV 내보내기
              {!isPro ? (
                <span className="ml-2 text-xs text-emerald-300">Supporter</span>
              ) : null}
            </button>
          </div>
        </div>

        {/* ✅ KPI + 전환율 + 30일 활동 */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard title="Total" value={total} />
          <StatCard title="Active" value={activeCount} />
          <StatCard
            title="Interview Rate"
            value={`${interviewRate.pct}%`}
            sub={`${interviewRate.num} / ${interviewRate.denom || 0}`}
          />
          <StatCard
            title="Offer Rate"
            value={`${offerRate.pct}%`}
            sub={`${offerRate.num} / ${offerRate.denom || 0}`}
          />
          <StatCard title="30일 생성" value={activity30.created} />
          <StatCard
            title="30일 활동"
            value={activity30.score}
            sub={`stage ${activity30.stageChanged} · 완료 ${activity30.doneLike}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="text-lg font-semibold">Stage 분포</div>
          <div className="mt-1 text-sm text-zinc-500">전체({total}) 기준</div>
          <div className="mt-4 space-y-2">
            {STAGES.map((s) => (
              <MiniBar
                key={s.value}
                label={s.label}
                value={stageCounts[s.value] ?? 0}
                total={total}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="text-lg font-semibold">Source 상위</div>
          <div className="mt-1 text-sm text-zinc-500">source 입력된 항목만</div>

          {sourceCounts.length === 0 ? (
            <div className="mt-4 text-sm text-zinc-500">
              source가 아직 없어요. (원티드/링크드인 등)
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {sourceCounts.slice(0, 10).map(([src, n]) => (
                <MiniBar key={src} label={src} value={n} total={total} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="text-lg font-semibold">Funnel(간단)</div>
        <div className="mt-1 text-sm text-zinc-500">
          지원 파이프라인 흐름을 한눈에
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Saved" value={funnel.saved} />
          <StatCard title="Applying" value={funnel.applying} />
          <StatCard title="Applied" value={funnel.applied} />
          <StatCard title="Test" value={funnel.test} />
          <StatCard title="Interview" value={funnel.interview} />
          <StatCard title="Offer" value={funnel.offer} />
          <StatCard title="Rejected/Withdrawn" value={funnel.rejectedOrWithdrawn} />
          <StatCard title="Archived" value={funnel.archived} />
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
          <div className="text-sm font-semibold text-zinc-100">한 줄 인사이트</div>
          <div className="mt-1 text-sm text-zinc-400 leading-relaxed">
            최근 30일 기준으로 <span className="text-zinc-200 font-semibold">생성 {activity30.created}개</span>,{" "}
            <span className="text-zinc-200 font-semibold">단계 변경 {activity30.stageChanged}회</span> 했어요.
            전환율은 <span className="text-zinc-200 font-semibold">Interview {interviewRate.pct}%</span>,{" "}
            <span className="text-zinc-200 font-semibold">Offer {offerRate.pct}%</span>예요.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">최근 업데이트(요약)</div>
            <div className="mt-1 text-sm text-zinc-500">가장 최근 로그 8개</div>
          </div>
          <button
            onClick={onOpenUpdates}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            전체 보기
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {logs.length === 0 ? (
            <div className="text-sm text-zinc-500">아직 기록이 없어요.</div>
          ) : (
            logs.slice(0, 8).map((l) => (
              <div
                key={l.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3"
              >
                <div className="text-xs text-zinc-500">
                  {new Date(l.ts).toLocaleString()} · {l.type}
                </div>
                <div className="mt-1 text-sm text-zinc-200">{l.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}