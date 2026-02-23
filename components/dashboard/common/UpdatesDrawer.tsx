import React from "react";

import type { ActivityLog } from "../../../lib/applications/types";
import { Drawer } from "./Drawer";

// ===== Updates Drawer (최근 업데이트 로그) =====
export function UpdatesDrawer({
  open,
  onClose,
  logs,
  onClear,
  onOpenDetails,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  onClear: () => void;
  onOpenDetails: (id: string) => void;
  onCopy: () => void;
}) {
  return (
    <Drawer open={open} title="최근 업데이트" onClose={onClose} widthPx={520}
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onClear}
            className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm"
          >
            로그 비우기
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onCopy}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              복사
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-950/40 font-medium text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      }
    >
      <div className="text-sm text-zinc-400">
        최근 {Math.min(100, logs.length)}개를 보여줘요. (로컬 저장)
      </div>

      <div className="mt-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-sm text-zinc-500">아직 기록이 없어요.</div>
        ) : (
          logs.slice(0, 60).map((l) => (
            <div key={l.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-500">
                    {new Date(l.ts).toLocaleString()} · {l.type}
                  </div>
                  <div className="mt-1 text-sm text-zinc-200 leading-relaxed">{l.message}</div>
                </div>
                {l.appId ? (
                  <button
                    onClick={() => onOpenDetails(l.appId!)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm shrink-0"
                  >
                    열기
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </Drawer>
  );
}
