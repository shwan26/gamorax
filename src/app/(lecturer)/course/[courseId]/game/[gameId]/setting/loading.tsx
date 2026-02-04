"use client";

import Navbar from "@/src/components/LecturerNavbar";

function SkeletonLine({ w = "w-40" }: { w?: string }) {
  return <div className={`h-3 ${w} animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70`} />;
}

function SkeletonBlock({ h = "h-10" }: { h?: string }) {
  return <div className={`${h} w-full animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60`} />;
}

export default function LoadingSettingLayout() {
  const menu = Array.from({ length: 6 });

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      {/* GameSubNavbar skeleton */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:pt-8">
        <div
          className="
            rounded-3xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <SkeletonLine w="w-72" />
              <SkeletonLine w="w-56" />
            </div>
            <div className="h-10 w-28 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:pt-6">
        <div
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
          style={{ minHeight: "calc(100vh - 220px)" }}
        >
          <div className="relative flex h-full">
            {/* LEFT MENU skeleton */}
            <aside className="w-[180px] shrink-0 border-r border-slate-200/70 p-3 dark:border-slate-800/70">
              <div className="px-2 pb-2">
                <SkeletonLine w="w-20" />
              </div>

              <nav className="flex flex-col gap-2">
                {menu.map((_, i) => (
                  <div
                    key={i}
                    className="
                      flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2.5
                    "
                  >
                    <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="flex-1">
                      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
                    </div>
                  </div>
                ))}
              </nav>
            </aside>

            {/* CONTENT skeleton */}
            <section className="flex-1 p-4 sm:p-6">
              <div
                className="
                  rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur
                  dark:border-slate-800/70 dark:bg-slate-950/55
                "
              >
                <div className="space-y-3">
                  <SkeletonLine w="w-48" />
                  <SkeletonBlock h="h-28" />
                  <SkeletonBlock h="h-14" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SkeletonBlock h="h-20" />
                    <SkeletonBlock h="h-20" />
                  </div>
                  <SkeletonBlock h="h-40" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
