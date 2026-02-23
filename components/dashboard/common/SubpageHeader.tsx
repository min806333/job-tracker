"use client";

import Link from "next/link";

export default function SubpageHeader({
  title,
  desc,
  backHref = "/dashboard",
  backLabel = "대시보드",
}: {
  title: string;
  desc?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {desc ? <p className="mt-1 text-sm text-zinc-400">{desc}</p> : null}
      </div>

      <Link
        href={backHref}
        className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-900/50 transition"
      >
        ← {backLabel}
      </Link>
    </div>
  );
}