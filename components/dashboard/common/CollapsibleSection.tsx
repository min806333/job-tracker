import React, { useState } from "react";

// ===== Generic collapsible list section =====
export function CollapsibleSection<T>({
  title,
  subtitle,
  items,
  defaultOpen = true,
  defaultVisibleCount = 3,
  renderItem,
  emptyText = "해당 없음",
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  items: T[];
  defaultOpen?: boolean;
  defaultVisibleCount?: number;
  renderItem: (item: T) => React.ReactNode;
  emptyText?: string;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? items : items.slice(0, defaultVisibleCount);
  const hasMore = items.length > defaultVisibleCount;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              <span className="text-sm text-zinc-400">{items.length}개</span>
            </div>
            {subtitle ? <div className="mt-1 text-sm text-zinc-500">{subtitle}</div> : null}
          </div>

          <div className="flex items-center gap-2">
            {rightSlot ? rightSlot : null}

            {hasMore ? (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
              >
                {showAll ? "Top 보기" : "전체 보기"}
              </button>
            ) : null}

            <button
              onClick={() => setOpen((v) => !v)}
              className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800 text-sm"
              title="섹션 접기/펼치기"
            >
              {open ? "접기" : "펼치기"}
            </button>
          </div>
        </div>

        {!open ? null : items.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-500">{emptyText}</div>
        ) : (
          <>
            <div className="mt-4 space-y-3">{visible.map(renderItem)}</div>

            {!showAll && hasMore ? (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
                >
                  + 더보기 ({items.length - defaultVisibleCount}개)
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
