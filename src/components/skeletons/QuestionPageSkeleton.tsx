// src/app/(lecturer)/course/[courseId]/game/[gameId]/question/QuestionPage.skeleton.tsx
"use client";

export default function QuestionPage() {
  return (
    <div className="min-h-screen app-surface app-bg">
      {/* Navbar skeleton */}
      <div
        className="
          sticky top-0 z-40
          border-b border-slate-200/70 bg-white/70 backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/55
        "
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="h-9 w-36 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-9 w-24 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          </div>
        </div>
      </div>

      {/* GameSubNavbar skeleton */}
      <div
        className="
          border-b border-slate-200/70 bg-white/50
          dark:border-slate-800/70 dark:bg-slate-950/35
        "
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="space-y-2">
            <div className="h-5 w-[360px] rounded-lg bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-4 w-[220px] rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:pt-8">
        <div
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
          style={{ height: "calc(100vh - 220px)" }}
        >
          {/* background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

          <div className="relative flex h-full">
            {/* Left list skeleton */}
            <aside
              className="
                w-[90px] shrink-0
                border-r border-slate-200/70
                dark:border-slate-800/70
                sm:w-[100px]
                lg:w-[120px]
              "
            >
              <div className="flex h-full flex-col items-center gap-3 p-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-full rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse"
                  />
                ))}
                <div className="mt-auto h-11 w-full rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
              </div>
            </aside>

            {/* Editor skeleton */}
            <section className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-7 w-52 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
                <div className="h-40 w-full rounded-3xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />

                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 w-full rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse"
                    />
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-12 w-full rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                  <div className="h-12 w-full rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                </div>

                <div className="h-56 w-full rounded-3xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
