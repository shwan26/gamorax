type Props = { count?: number };

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/70",
        className,
      ].join(" ")}
    />
  );
}

function CourseCardSkeleton() {
  return (
    <div
      className="
        group relative overflow-hidden rounded-3xl p-[1px]
        bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
        shadow-[0_12px_30px_rgba(37,99,235,0.10)]
      "
    >
      <div
        className="
          relative rounded-[23px] bg-white ring-1 ring-slate-200/70
          dark:bg-[#071A33] dark:ring-slate-700/60
          p-6 min-h-[140px]
        "
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative flex h-full flex-col">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="h-11 w-11 rounded-2xl" />

            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-1/3" />
              <SkeletonBlock className="h-4 w-5/6" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
          </div>

          <div className="mt-auto pt-4 flex gap-2">
            <SkeletonBlock className="h-6 w-20 rounded-full" />
            <SkeletonBlock className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSkeletonGrid({ count = 6 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </>
  );
}
