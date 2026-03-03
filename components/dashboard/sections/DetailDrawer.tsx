"use client";

import type { DashboardController } from "../hooks/useDashboardController";
import { Drawer } from "../common/Drawer";
import { STAGES } from "../../../lib/applications/types";
import type { Stage } from "../../../lib/applications/types";

export function DetailDrawer({
  c,
  readOnly = false,
}: {
  c: DashboardController;
  readOnly?: boolean;
}) {
  const selected = c.selected;
  const selectedId = c.selectedId;

  if (!selected || !selectedId) {
    return (
      <Drawer open={c.drawerOpen} title="상세" onClose={() => c.setDrawerOpen(false)}>
        <div className="text-sm text-zinc-500">선택된 항목이 없습니다.</div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={c.drawerOpen}
      title={`${selected.company} / ${selected.role}`}
      onClose={() => c.setDrawerOpen(false)}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => c.togglePin(selectedId)}
              className={[
                "px-4 py-2 rounded-xl text-sm",
                c.pinnedSet.has(selectedId)
                  ? "border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40"
                  : "bg-zinc-800 hover:bg-zinc-700",
              ].join(" ")}
              disabled={c.busyId === selectedId}
            >
              {c.pinnedSet.has(selectedId) ? "📌 Focus 해제" : "📌 Focus 핀"}
            </button>

            <button
              onClick={() => {
                c.scheduleDelete(selectedId);
                c.setDrawerOpen(false);
              }}
              className="px-4 py-2 rounded-xl bg-red-950/40 border border-red-900/40 text-red-200 hover:bg-red-950/60 text-sm disabled:opacity-50"
              disabled={readOnly || c.busyId === selectedId}
            >
              삭제
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => c.setDrawerOpen(false)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">
              닫기
            </button>

            <button
              onClick={c.saveDetailsManual}
              disabled={readOnly || c.busyId === selectedId}
              className="px-4 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 font-medium hover:bg-emerald-950/40 text-sm disabled:opacity-50"
            >
              {c.busyId === selectedId ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {readOnly ? (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-sm text-amber-100">
            읽기 전용 상태예요. 데이터는 안전하며 조회는 계속 가능합니다.
          </div>
        ) : null}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
          <div className="text-sm font-semibold">빠른 액션</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => c.markDone(selected.id)}
              disabled={readOnly || c.busyId === selected.id}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
            >
              ✅ 완료
            </button>

            <button
              onClick={() => c.followupDoneOnly(selected.id)}
              disabled={readOnly || c.busyId === selected.id}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-50"
            >
              🔁 팔로업 완료
            </button>

            <button
              onClick={() => c.postponeFollowup(selected.id, 3)}
              disabled={readOnly || c.busyId === selected.id}
              className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
            >
              +3일
            </button>

            <button
              onClick={() => c.postponeFollowup(selected.id, 7)}
              disabled={readOnly || c.busyId === selected.id}
              className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm disabled:opacity-50"
            >
              +7일
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <input
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 disabled:opacity-50"
            value={c.edCompany}
            onChange={(e) => c.setEdCompany(e.target.value)}
            disabled={readOnly}
          />

          <input
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 disabled:opacity-50"
            value={c.edRole}
            onChange={(e) => c.setEdRole(e.target.value)}
            disabled={readOnly}
          />

          <select
            className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 disabled:opacity-50"
            value={c.edStage}
            onChange={(e) => c.setEdStage(e.target.value as Stage)}
            disabled={readOnly}
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-500">
          <div>id: {selected.id}</div>
          <div className="mt-1">created_at: {selected.created_at}</div>
        </div>
      </div>
    </Drawer>
  );
}

