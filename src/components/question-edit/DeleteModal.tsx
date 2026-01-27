"use client";

import { AlertTriangle, X } from "lucide-react";
import GradientButton from "@/src/components/GradientButton";

export default function DeleteModal({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-slate-950/50 backdrop-blur-sm
        px-4
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="
          relative w-full max-w-sm overflow-hidden rounded-3xl p-[1px]
          bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
          shadow-[0_18px_55px_rgba(0,0,0,0.25)]
        "
      >
        <div
          className="
            relative rounded-[23px] bg-white/90 p-5 backdrop-blur
            ring-1 ring-slate-200/70
            dark:bg-slate-950/80 dark:ring-slate-800/70
          "
        >
          {/* dot pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />

          {/* close */}
          <button
            type="button"
            onClick={onCancel}
            className="
              absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full
              border border-slate-200/80 bg-white/80 shadow-sm
              hover:bg-white transition-colors
              dark:border-slate-800/70 dark:bg-slate-950/60 dark:hover:bg-slate-950/80
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
            "
            aria-label="Close"
            title="Close"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-200" />
          </button>

          <div className="relative">
            {/* header */}
            <div className="flex items-start gap-3 pr-10">
              <div
                className="
                  rounded-2xl border border-red-200/80 bg-red-50/70 p-3
                  dark:border-red-900/40 dark:bg-red-950/30
                "
              >
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
              </div>

              <div className="min-w-0">
                <h3
                  id="delete-modal-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-50"
                >
                  {title}
                </h3>
                {description ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            {/* actions */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <GradientButton variant="ghost" onClick={onCancel}>
                Cancel
              </GradientButton>

              <GradientButton variant="danger" onClick={onConfirm}>
                Delete
              </GradientButton>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              Tip: You can press <span className="font-semibold">Cancel</span>{" "}
              if you’re not sure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
