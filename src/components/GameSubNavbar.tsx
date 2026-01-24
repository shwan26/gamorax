"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { createLiveSession } from "@/src/lib/liveStorage";
import { ArrowLeft, HelpCircle, Settings, Radio } from "lucide-react";

export default function GameSubNavbar({ title }: { title: string }) {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const router = useRouter();

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const pathname = usePathname() ?? "";
  const base = `/course/${courseId}/game/${gameId}`;

  const isQuestion = pathname.startsWith(`${base}/question`);
  const isSetting = pathname.startsWith(`${base}/setting`);
  const isLive = pathname.startsWith(`${base}/live`);

  const onClickLive = () => {
    const session = createLiveSession(gameId);
    const pin = session.pin;
    router.push(`${base}/live?pin=${encodeURIComponent(pin)}`);
  };

  const Tab = ({
    href,
    active,
    icon: Icon,
    label,
  }: {
    href?: string;
    active: boolean;
    icon: React.ElementType;
    label: string;
  }) => {
    const common =
      "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all " +
      "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40";

    const activeCls =
      "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] text-white shadow-[0_10px_25px_rgba(37,99,235,0.18)]";
    const inactiveCls =
      "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm hover:bg-white " +
      "dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-950/70";

    const content = (
      <>
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </>
    );

    if (href) {
      return (
        <Link href={href} className={`${common} ${active ? activeCls : inactiveCls}`}>
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        className={`${common} ${active ? activeCls : inactiveCls}`}
        onClick={onClickLive}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="px-4 sm:px-6 mt-4">
      <div
        className="
          relative overflow-hidden rounded-3xl
          border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/45
        "
      >
        {/* dot pattern like your landing cards */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        {/* soft glow */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#00D4FF]/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-60 w-60 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* left: back */}
          <Link
            href={`/course/${courseId}`}
            className="
              inline-flex items-center gap-2 text-sm font-semibold
              text-slate-700 hover:text-slate-900 transition-colors
              dark:text-slate-200 dark:hover:text-slate-50
            "
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>

          {/* center: title */}
          <Link
            href={`${base}/question`}
            className="
              inline-flex items-center justify-center gap-2
              text-sm font-semibold text-slate-900
              hover:opacity-90 transition
              dark:text-slate-50
            "
            title="Open questions"
          >
           
            <span className="max-w-[260px] truncate sm:max-w-[360px]">
              {title}
            </span>
          </Link>

          {/* right: tabs */}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Tab
              href={`${base}/setting/general`}
              active={isSetting}
              icon={Settings}
              label="Setting"
            />
            <Tab active={isLive} icon={Radio} label="Live" />
          </div>
        </div>
      </div>
    </div>
  );
}
