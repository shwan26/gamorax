// src/components/live/answerStyles.ts
export const ANSWER_LABELS = ["A", "B", "C", "D"] as const;

export const BADGE_ACCENT = "from-[#00D4FF] via-[#38BDF8] to-[#020024]";

/**
 * Label badge wrapper (the small outline gradient)
 * use: <div className={BADGE_OUTER}><div className={`${BADGE_INNER} ${BADGE_ACCENT}`}>...</div></div>
 */
export const BADGE_OUTER = "shrink-0 rounded-2xl bg-gradient-to-br p-[1px]";
export const BADGE_INNER =
  "flex items-center justify-center rounded-2xl text-white shadow-sm bg-gradient-to-br";

/**
 * Answer card surface (optional reuse)
 */
export const ANSWER_CARD =
  "group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/60 p-5 sm:p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-950/45";

/**
 * Student pick button base
 */
export const PICK_BTN_BASE =
  "flex items-center justify-center rounded-3xl shadow-md active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40";
