"use client";

import {
  ANSWER_LABELS,
  BADGE_ACCENT,
  PICK_BTN_BASE,
} from "@/src/styles/answerStyles";

export default function AnswerGrid(props: {
  selectedIndex: number | null;
  disabled: boolean;
  onPick: (idx: number) => void;
  labelClassName?: string;
}) {
  const { selectedIndex, disabled, onPick, labelClassName } = props;
  const hasPicked = selectedIndex !== null;

  return (
    <div className="w-full">
      <div
        className="
          mx-auto grid w-full max-w-md grid-cols-2 gap-3
          sm:max-w-lg sm:gap-4
          md:max-w-2xl md:gap-6
        "
      >
        {ANSWER_LABELS.map((label, idx) => {
          const isSelected = selectedIndex === idx;
          const dimClass = hasPicked && !isSelected ? "opacity-40" : "opacity-100";

          // one shared gradient
          const base = `bg-gradient-to-br ${BADGE_ACCENT}`;

          const selected = "brightness-110 ring-4 ring-white/70";

          return (
            <button
              key={label}
              disabled={disabled}
              onClick={() => onPick(idx)}
              type="button"
              className={[
                PICK_BTN_BASE,
                "min-h-[120px] sm:min-h-[140px] md:min-h-[170px]",
                base,
                isSelected ? selected : "",
                dimClass,
                disabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
              aria-pressed={isSelected}
            >
              <span
                className={[
                  labelClassName ?? "",
                  "text-white font-extrabold",
                  "text-5xl sm:text-6xl md:text-7xl",
                ].join(" ")}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
