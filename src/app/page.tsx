"use client";

import Link from "next/link";
import Navbar from "../components/Navbar";
import {
  ArrowRight,
  GraduationCap,
  UserRound,
  Zap,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="
        rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur
        hover:shadow-md transition-shadow
        dark:border-slate-800/70 dark:bg-slate-950/55
      "
    >
      <div className="flex items-start gap-3">
        <div
          className="
            rounded-xl border border-slate-200/80 bg-white/80 p-2
            dark:border-slate-800/70 dark:bg-slate-950/60
          "
        >
          <Icon className="h-5 w-5 text-[#020024] dark:text-[#00D4FF]" />
        </div>

        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  href,
  title,
  subtitle,
  icon: Icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      aria-label={`Enter as ${title}`}
      className="
        group relative overflow-hidden rounded-3xl p-[1px]
        bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
        shadow-[0_12px_30px_rgba(37,99,235,0.10)]
        transition-all hover:-translate-y-1
        focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50

        hover:bg-gradient-to-r hover:from-[#A7F3FF] hover:via-[#22D3EE] hover:to-[#60A5FA]
        hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_18px_55px_rgba(56,189,248,0.18)]

        dark:bg-gradient-to-r dark:from-[#00D4FF] dark:via-[#60A5FA] dark:to-[#3B82F6]
        dark:hover:from-[#A7F3FF] dark:hover:via-[#00D4FF] dark:hover:to-[#93C5FD]
      "
    >
      
      {/* inner card */}
      <div
        className="
          relative rounded-3xl bg-white/85 p-5 backdrop-blur
          sm:p-6 md:p-7
          dark:bg-slate-950/70
        "
      >
        {/* subtle dot pattern (uses CSS var so it adapts in dark mode) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* glow blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#020024]/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity dark:bg-[#020024]/30" />

        <div className="relative flex items-center gap-4 sm:gap-5">
          {/* icon badge */}
          <div className="shrink-0 rounded-2xl bg-gradient-to-br p-[1px]">
            <div className="rounded-2xl bg-white/90 p-3 dark:bg-slate-950/75">
              <Icon className="h-7 w-7 text-[#020024] dark:text-[#00D4FF]" />
            </div>
          </div>

          <div className="flex-1">
            <p className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-slate-50">
              Enter as {title}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          </div>

          {/* arrow */}
          <div
            className="
              flex h-10 w-10 items-center justify-center rounded-full
              border border-slate-200/80 bg-white/90 shadow-sm
              group-hover:border-[#00D4FF]/40 transition-colors
              dark:border-slate-800/70 dark:bg-slate-950/70
            "
          >
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all dark:group-hover:text-slate-50" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:pt-12 sm:pb-16 md:pt-16">
        {/* hero */}
        <div className="text-center">
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-[#020024] to-[#00D4FF] bg-clip-text text-transparent dark:from-[#A7F3FF] dark:via-[#00D4FF] dark:to-[#7C3AED]">
              Empower Learning
            </span>{" "}
            <span className="text-slate-900 dark:text-slate-50">
              Through Play
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Create and join interactive quiz sessions in seconds — designed to
            stay minimal, fast, and classroom-friendly.
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:mt-12 md:grid-cols-2">
          <RoleCard
            href={`/login?role=lecturer&next=${encodeURIComponent("/dashboard")}`}
            title="Lecturer"
            subtitle="Create games and host live sessions."
            icon={GraduationCap}
          />
          <RoleCard
            href={`/login?role=student&next=${encodeURIComponent("/me")}`}
            title="Student"
            subtitle="Join instantly and answer on your device."
            icon={UserRound}
          />
        </div>


        {/* features */}
        <div className="mt-8 grid gap-4 sm:mt-10 md:mt-12 md:grid-cols-3">
          <FeatureCard
            icon={Zap}
            title="Fast to start"
            desc="Clean flow from entry to session — no clutter."
          />
          <FeatureCard
            icon={Sparkles}
            title="Minimal UI"
            desc="Focus on learning, not buttons everywhere."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Classroom-ready"
            desc="Simple, readable, and works well on any screen size."
          />
        </div>

        {/* how it works */}
        <div
          className="
            mt-10 rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur
            sm:p-6 md:mt-12 md:p-8
            dark:border-slate-800/70 dark:bg-slate-950/55
          "
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            How it works
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Create", d: "Add questions and set up a game." },
              { n: "02", t: "Start", d: "Launch a live session for your class." },
              { n: "03", t: "Join", d: "Students enter a PIN and participate." },
            ].map((s) => (
              <div
                key={s.n}
                className="
                  rounded-2xl border border-slate-200/80 bg-white/80 p-5
                  dark:border-slate-800/70 dark:bg-slate-950/60
                "
              >
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {s.n}
                </p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-slate-50">
                  {s.t}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} GAMORAX
        </footer>
      </main>
    </div>
  );
}
