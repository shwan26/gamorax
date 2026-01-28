"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BADGE_ACCENT, PICK_BTN_BASE } from "@/src/styles/answerStyles";

const ABCDE = ["A", "B", "C", "D", "E"] as const;

type QType = "multiple_choice" | "true_false" | "matching" | "input";

type Props = {
  q: any;
  disabled: boolean;

  // MC / TF submit (single click)
  onSubmitChoice: (payload: { indices: number[] }) => void;

  // Matching (required for matching type)
  onAttemptMatch?: (payload: {
    leftIndex: number;
    rightIndex: number;
  }) => Promise<{ correct: boolean }>;

  // Input (required for input type)
  onSubmitInput?: (payload: { value: string }) => void;
};

export default function AnswerGrid({
  q,
  disabled,
  onSubmitChoice,
  onAttemptMatch,
  onSubmitInput,
}: Props) {
  const type = (q?.type ?? "multiple_choice") as QType;

  // Reset internal state when question changes
  const qKey = `${q?.questionIndex ?? ""}|${q?.id ?? ""}|${type}`;
  useEffect(() => {
    submittedOnceRef.current = false;
    setPickedIndex(null);

    setSelSide(null);
    setSelIndex(null);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());

    setInputValue("");
  }, [qKey]);

  /* =======================
     MULTIPLE CHOICE / TRUEFALSE
  ======================== */

  const options: string[] = useMemo(() => {
    if (type === "true_false") return ["True", "False"];

    if (type === "multiple_choice") {
      // supports your current q.answers = string[] OR q.answers = [{text}]
      const a = Array.isArray(q?.answers) ? q.answers : [];
      return a
        .map((x: any) => (typeof x === "string" ? x : String(x?.text ?? "")))
        .filter((s: string) => s.length > 0);
    }

    return [];
  }, [type, q]);

  const labels = useMemo(() => {
    // MC: A..E sliced to options length
    if (type === "multiple_choice") return ABCDE.slice(0, Math.min(5, options.length));
    // TF: no letter labels, just show text
    return [];
  }, [type, options.length]);

  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const submittedOnceRef = useRef(false);

  function submitSingleChoice(idx: number) {
    if (disabled) return;
    if (submittedOnceRef.current) return;

    submittedOnceRef.current = true;
    setPickedIndex(idx);
    onSubmitChoice({ indices: [idx] });
  }

  /* =======================
     MATCHING
  ======================== */

  const leftItems: string[] = useMemo(
    () => (Array.isArray(q?.left) ? q.left.map((x: any) => String(x ?? "")) : []),
    [q]
  );
  const rightItems: string[] = useMemo(
    () => (Array.isArray(q?.right) ? q.right.map((x: any) => String(x ?? "")) : []),
    [q]
  );

  // “matched” become disabled (not clickable)
  const [matchedLeft, setMatchedLeft] = useState<Set<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<Set<number>>(() => new Set());

  // selection can start from either side
  const [selSide, setSelSide] = useState<"L" | "R" | null>(null);
  const [selIndex, setSelIndex] = useState<number | null>(null);

  const matchingBusyRef = useRef(false);

  async function tryMatch(leftIndex: number, rightIndex: number) {
    if (disabled) return;
    if (!onAttemptMatch) return;
    if (matchingBusyRef.current) return;

    matchingBusyRef.current = true;
    try {
      const res = await onAttemptMatch({ leftIndex, rightIndex });

      if (res?.correct) {
        setMatchedLeft((prev) => {
          const nx = new Set(prev);
          nx.add(leftIndex);
          return nx;
        });
        setMatchedRight((prev) => {
          const nx = new Set(prev);
          nx.add(rightIndex);
          return nx;
        });
      }
      // wrong: no state changes besides clearing selection
    } finally {
      setSelSide(null);
      setSelIndex(null);
      matchingBusyRef.current = false;
    }
  }

  function clickLeft(i: number) {
    if (disabled) return;
    if (matchedLeft.has(i)) return;

    // if already selected right -> attempt match
    if (selSide === "R" && selIndex !== null) {
      void tryMatch(i, selIndex);
      return;
    }

    // otherwise select left
    setSelSide("L");
    setSelIndex(i);
  }

  function clickRight(i: number) {
    if (disabled) return;
    if (matchedRight.has(i)) return;

    // if already selected left -> attempt match
    if (selSide === "L" && selIndex !== null) {
      void tryMatch(selIndex, i);
      return;
    }

    // otherwise select right
    setSelSide("R");
    setSelIndex(i);
  }

  /* =======================
     INPUT
  ======================== */

  const [inputValue, setInputValue] = useState("");

  function submitInput() {
    if (disabled) return;
    if (!onSubmitInput) return;

    const v = inputValue.trim();
    if (!v) return;

    onSubmitInput({ value: v });
  }

  /* =======================
     UI
  ======================== */

  const grad = `bg-gradient-to-br ${BADGE_ACCENT}`;

  // INPUT: only the textbox (submit on Enter)
  if (type === "input") {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-md sm:max-w-lg">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitInput();
            }}
            disabled={disabled}
            placeholder="Type your answer..."
            className="
              w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-base
              font-semibold text-slate-800 shadow-sm outline-none
              focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
              disabled:opacity-70
              dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
            "
          />
        </div>
      </div>
    );
  }

  // MATCHING: shuffled left/right, start from either side, correct disables, wrong clears selection
  if (type === "matching") {
    return (
      <div className="w-full">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-4">
          {/* LEFT */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Word L</p>

            {leftItems.map((t, i) => {
              const isMatched = matchedLeft.has(i);
              const isSelected = selSide === "L" && selIndex === i;

              return (
                <button
                  key={`L-${i}`}
                  type="button"
                  disabled={disabled || isMatched}
                  onClick={() => clickLeft(i)}
                  className={[
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold",
                    "border shadow-sm transition",
                    isSelected ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25" : "border-slate-200/70",
                    "bg-white/80 dark:bg-slate-950/45 dark:border-slate-800/70",
                    isMatched ? "opacity-35 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
                    disabled ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {t || `Left ${i + 1}`}
                </button>
              );
            })}
          </div>

          {/* RIGHT */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Word R</p>

            {rightItems.map((t, i) => {
              const isMatched = matchedRight.has(i);
              const isSelected = selSide === "R" && selIndex === i;

              return (
                <button
                  key={`R-${i}`}
                  type="button"
                  disabled={disabled || isMatched}
                  onClick={() => clickRight(i)}
                  className={[
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold",
                    "border shadow-sm transition",
                    isSelected ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25" : "border-slate-200/70",
                    "bg-white/80 dark:bg-slate-950/45 dark:border-slate-800/70",
                    isMatched ? "opacity-35 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
                    disabled ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {t || `Right ${i + 1}`}
                </button>
              );
            })}
          </div>

        </div>

        {!onAttemptMatch ? (
          <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-300">
            Matching handler is not wired yet.
          </p>
        ) : null}
      </div>
    );
  }

  // TRUE/FALSE: only show 2 buttons with text, no ABC labels
  if (type === "true_false") {
    return (
      <div className="w-full">
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-lg sm:gap-4">
          {options.map((text, idx) => {
            const isSelected = pickedIndex === idx;
            const dimClass = pickedIndex !== null && !isSelected ? "opacity-40" : "opacity-100";
            const selected = isSelected ? "brightness-110 ring-4 ring-white/70" : "";

            return (
              <button
                key={idx}
                disabled={disabled || submittedOnceRef.current}
                onClick={() => submitSingleChoice(idx)}
                type="button"
                className={[
                  PICK_BTN_BASE,
                  "min-h-[120px] sm:min-h-[140px]",
                  grad,
                  selected,
                  dimClass,
                ].join(" ")}
              >
                <span className="text-white font-extrabold text-xl sm:text-2xl">{text}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // MULTIPLE CHOICE: show A..E labels based on options length, click once submit
  return (
    <div className="w-full">
      <div
        className="
          mx-auto grid w-full max-w-md grid-cols-2 gap-3
          sm:max-w-lg sm:gap-4
          md:max-w-2xl md:gap-6
        "
      >
        {options.slice(0, 5).map((text, idx) => {
          const isSelected = pickedIndex === idx;
          const dimClass = pickedIndex !== null && !isSelected ? "opacity-40" : "opacity-100";
          const selected = isSelected ? "brightness-110 ring-4 ring-white/70" : "";

          return (
            <button
              key={idx}
              disabled={disabled || submittedOnceRef.current}
              onClick={() => submitSingleChoice(idx)}
              type="button"
              className={[
                PICK_BTN_BASE,
                "min-h-[120px] sm:min-h-[140px] md:min-h-[170px]",
                grad,
                selected,
                dimClass,
              ].join(" ")}
              aria-pressed={isSelected}
            >
              <div className="flex flex-col items-center gap-2 px-3">
                <span className="text-white font-extrabold text-5xl sm:text-6xl md:text-7xl">
                  {labels[idx] ?? "?"}
                </span>
                <span className="text-white/95 text-sm sm:text-base font-semibold text-center line-clamp-2">
                  {text}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
