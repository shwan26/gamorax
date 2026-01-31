// src/components/GameSubNavbar.tsx
"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Settings, Radio } from "lucide-react";
import { useEffect, useState } from "react";

export default function GameSubNavbar({
  title,
  canStartLive,
  liveBlockReason,
}: {
  title: string;
  canStartLive: boolean;
  liveBlockReason?: string;
}) {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const base = `/course/${courseId}/game/${gameId}`;
  const isSetting = pathname.startsWith(`${base}/setting`);
  const isLive = pathname.startsWith(`${base}/live`);

  const [liveErr, setLiveErr] = useState<string | null>(null);

  useEffect(() => {
    if (canStartLive) setLiveErr(null);
  }, [canStartLive]);

  const common =
    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all " +
    "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40";

  const activeCls =
    "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] text-white shadow-[0_10px_25px_rgba(37,99,235,0.18)]";
  const inactiveCls =
    "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm hover:bg-white " +
    "dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-950/70";

  function handleClickLive(e: React.MouseEvent) {
    if (!canStartLive) {
      // ✅ block navigation
      e.preventDefault();
      setLiveErr(
        liveBlockReason ??
          "You can’t start Live yet. Please complete all questions (turn them green) before going live."
      );
      return;
    }

    // ✅ allow navigation (and clear error)
    setLiveErr(null);

    // optional: force navigation with router (either is fine)
    // e.preventDefault();
    // router.push(`${base}/live`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-4">
      <div
        className="
          relative overflow-hidden rounded-3xl
          border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/45
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
        <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#00D4FF]/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-60 w-60 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/course/${courseId}`}
            className="
              inline-flex items-center gap-2 text-xs font-semibold
              text-slate-700 hover:text-slate-900 transition-colors
              dark:text-slate-200 dark:hover:text-slate-50
            "
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>

          <Link
            href={`${base}/question`}
            className="
              inline-flex items-center justify-center
              text-lg sm:text-l font-semibold
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
              bg-clip-text text-transparent
              hover:opacity-90 transition
            "
            title="Open questions"
          >
            <span className="max-w-[260px] truncate sm:max-w-[360px]">{title}</span>
          </Link>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href={`${base}/setting/general`}
              className={`${common} ${isSetting ? activeCls : inactiveCls}`}
            >
              <Settings className="h-4 w-4" />
              <span>Setting</span>
            </Link>

            {/* ✅ Live blocks navigation when quiz not ready */}
            <Link
              href={`${base}/live`}
              onClick={handleClickLive}
              aria-disabled={!canStartLive}
              className={`${common} ${isLive ? activeCls : inactiveCls} ${
                !canStartLive ? "opacity-60" : ""
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>Live</span>
            </Link>
          </div>
        </div>
      </div>

      {liveErr ? (
        <div className="mt-3 rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
          {liveErr}
        </div>
      ) : null}
    </div>
  );
}
