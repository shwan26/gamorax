"use client";

function Skel({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/60",
        className,
      ].join(" ")}
    />
  );
}

function GameCardSkeleton() {
  return (
    <div
      className="
        relative overflow-hidden rounded-3xl p-[1px]
        bg-gradient-to-r from-[#00D4FF]/40 via-[#38BDF8]/40 to-[#2563EB]/40
      "
    >
      <div className="relative rounded-[23px] bg-white/70 ring-1 ring-slate-200/70 dark:bg-[#071A33]/60 dark:ring-slate-700/60 p-6 min-h-[120px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative flex items-start gap-3">
          <Skel className="h-12 w-12 rounded-2xl" />

          <div className="min-w-0 flex-1 space-y-3">
            <Skel className="h-5 w-3/4 rounded-lg" />
            <div className="flex items-center gap-2">
              <Skel className="h-4 w-4 rounded-md" />
              <Skel className="h-4 w-1/2 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateCardSkeleton() {
  return <GameCardSkeleton />;
}

export default function CoursePageSkeleton() {
  return (
    <div className="min-h-screen app-surface app-bg">
      {/* navbar is already rendered by your page, but keeping layout consistent */}
      <div>

        {/* grid skeleton */}
        <div className="mt-6 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CreateCardSkeleton />
          {Array.from({ length: 8 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
