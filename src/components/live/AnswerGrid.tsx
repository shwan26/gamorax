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
    <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-3xl">
      {["A", "B", "C", "D"].map((label, idx) => {
        const isSelected = selectedIndex === idx;

        // ✅ always blue
        const bgClass = isSelected ? "bg-[#034B6B]" : "bg-[#3B8ED6]";

        // ✅ dim only AFTER pick (before pick: no dim)
        const dimClass = hasPicked && !isSelected ? "opacity-40" : "opacity-100";

        return (
          <button
            key={label}
            disabled={disabled}
            onClick={() => onPick(idx)}
            className={`h-24 md:h-28 rounded-lg shadow-md flex items-center justify-center
              active:scale-[0.98] transition
              ${bgClass} ${dimClass}
              ${isSelected ? "ring-4 ring-white/80" : ""}
              ${disabled && !isSelected ? "cursor-not-allowed" : ""}
            `}
            type="button"
          >
            <span className={`${labelClassName ?? ""} text-4xl md:text-5xl text-white`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
