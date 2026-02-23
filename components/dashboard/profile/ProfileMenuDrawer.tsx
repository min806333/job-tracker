"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { DashboardController } from "../hooks/useDashboardController";
import { Drawer } from "../common/Drawer";

function MenuItem({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-900/50 transition flex items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <div className="font-medium text-zinc-100">{title}</div>
        {desc ? <div className="text-sm text-zinc-400 mt-0.5">{desc}</div> : null}
      </div>
      <div className="text-zinc-500">›</div>
    </button>
  );
}

export default function ProfileMenuDrawer({ c }: { c: DashboardController }) {
  const router = useRouter();

  const planLabel = useMemo(() => {
    return (c.entitlements?.plan ?? "free").toUpperCase();
  }, [c.entitlements?.plan]);

  const userInitial = useMemo(() => {
    const email = c.userEmail ?? "";
    return (email[0] ?? "U").toUpperCase();
  }, [c.userEmail]);

  function go(path: string) {
    c.setProfileMenuOpen(false);
    router.push(path);
  }

  return (
    <Drawer open={c.profileMenuOpen} onClose={() => c.setProfileMenuOpen(false)} title="메뉴">
      {/* Drawer가 full-screen 컨테이너여도, 내부에서 우측 패널로 강제 */}
      <div className="h-full flex justify-end">
        <div className="h-full w-[360px] max-w-[90vw] border-l border-zinc-800 bg-zinc-950">
          <div className="px-4 py-4">
            {/* Account card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center text-sm font-semibold text-zinc-100">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-zinc-400">로그인</div>
                  <div className="font-medium text-zinc-100 truncate">{c.userEmail}</div>
                </div>
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                <span className="text-xs text-zinc-400">Plan</span>
                <span
                  className={`text-xs font-semibold ${
                    planLabel === "PRO" ? "text-emerald-400" : "text-zinc-100"
                  }`}
                >
                  {planLabel}
                </span>
                <span className="text-xs text-zinc-600">•</span>
                <span className="text-xs text-zinc-400">{c.planLoading ? "loading…" : "active"}</span>
              </div>
            </div>

            {/* Menu list */}
            <div className="mt-4 space-y-3">
              <MenuItem title="계정 상세 정보" desc="프로필/보안(추후)" onClick={() => go("/dashboard/account")} />
              <MenuItem title="설정" desc="알림/테마/단축키(추후)" onClick={() => go("/dashboard/settings")} />
              <MenuItem title="내 플랜" desc={`현재: ${planLabel}`} onClick={() => go("/dashboard/plan")} />
              <MenuItem title="도움말" desc="가이드/FAQ" onClick={() => go("/dashboard/help")} />
              <MenuItem title="고객센터" desc="문의/피드백" onClick={() => go("/dashboard/support")} />

              <button
                type="button"
                onClick={async () => {
                  c.setProfileMenuOpen(false);
                  await c.signOut();
                }}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 hover:bg-zinc-900/50 transition"
              >
                <div className="font-medium text-zinc-100">로그아웃</div>
                <div className="text-sm text-zinc-400 mt-0.5">현재 계정에서 로그아웃</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}