import * as React from "react";

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  iconLeft?: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}

export default function GradientButton({
  children,
  onClick,
  className = "",
  type = "button",
  iconLeft,
  variant = "primary",
  disabled = false,
}: GradientButtonProps) {
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  // ghost = your previous GhostButton look
  if (isGhost) {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={[
          "w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40",
          "border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white/90",
          "dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-950/70",
          disabled ? "cursor-not-allowed opacity-60" : "",
          className,
        ].join(" ")}
      >
        <span className="inline-flex w-full items-center justify-center gap-2">
          {iconLeft ? <span className="shrink-0">{iconLeft}</span> : null}
          <span>{children}</span>
        </span>
      </button>
    );
  }

  // primary / danger = gradient border style (landing-like)
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative w-full overflow-hidden rounded-2xl p-[1px]",
        isDanger
          ? "bg-gradient-to-r from-red-500 via-rose-500 to-orange-500"
          : "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
        "shadow-[0_12px_30px_rgba(37,99,235,0.10)] transition-all",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_18px_55px_rgba(56,189,248,0.18)]",
        "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "block w-full rounded-2xl px-4 py-2.5 backdrop-blur font-semibold transition-colors",
          isDanger
            ? "bg-red-50/80 text-red-700 group-hover:bg-red-50 dark:bg-red-950/30 dark:text-red-100 dark:group-hover:bg-red-950/40"
            : "bg-white/85 text-slate-900 group-hover:bg-white/90 dark:bg-slate-950/70 dark:text-slate-50 dark:group-hover:bg-slate-950/75",
        ].join(" ")}
      >
        <span className="inline-flex w-full items-center justify-center gap-2">
          {iconLeft ? <span className="shrink-0">{iconLeft}</span> : null}
          <span>{children}</span>
        </span>
      </span>
    </button>
  );
}
