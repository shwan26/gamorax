"use client";

// src/components/live/AnswerGrid.tsx
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
        {(["A", "B", "C", "D"] as const).map((label, idx) => {
          const isSelected = selectedIndex === idx;

          // optional: dim others only after pick
          const dimClass = hasPicked && !isSelected ? "opacity-40" : "opacity-100";

          // ✅ ONE gradient only (same style for all)
          const base =
            "bg-gradient-to-b from-[#034B6B] to-[#0B6FA6]";

          // ✅ selected: slightly stronger + ring (but still shows all 4)
          const selected =
            "from-[#023754] to-[#0A5E8F] ring-4 ring-white/70";

          return (
            <button
              key={label}
              disabled={disabled}
              onClick={() => onPick(idx)}
              type="button"
              className={[
                "flex items-center justify-center",
                "rounded-3xl shadow-md",
                "min-h-[120px] sm:min-h-[140px] md:min-h-[170px]", // mobile friendly
                "active:scale-[0.98] transition",
                "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40",
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
