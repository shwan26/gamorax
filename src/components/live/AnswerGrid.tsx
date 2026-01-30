// src/components/live/AnswerGrid.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BADGE_ACCENT, PICK_BTN_BASE } from "@/src/styles/answerStyles";

const ABCDE = ["A", "B", "C", "D", "E"] as const;

type QType = "multiple_choice" | "true_false" | "matching" | "input";

type Props = {
  q: any;
  disabled: boolean;

  onSubmitChoice: (payload: { indices: number[] }) => void;
  onAttemptMatch?: (payload: { leftIndex: number; rightIndex: number }) => Promise<{ correct: boolean }>;
  onSubmitInput?: (payload: { value: string }) => void;
};

export default function AnswerGrid({ q, disabled, onSubmitChoice, onAttemptMatch, onSubmitInput }: Props) {
  const type = (q?.type ?? "multiple_choice") as QType;

  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const submittedOnceRef = useRef(false);

  const [matchedLeft, setMatchedLeft] = useState<Set<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<Set<number>>(() => new Set());
  const [selSide, setSelSide] = useState<"L" | "R" | null>(null);
  const [selIndex, setSelIndex] = useState<number | null>(null);

  const [inputValue, setInputValue] = useState("");
  const inputSubmittedRef = useRef(false);

  const qKey = `${q?.questionIndex ?? ""}|${q?.id ?? ""}|${type}`;

  // ✅ IMPORTANT: reset ALL refs for new question, including inputSubmittedRef
  useEffect(() => {
    submittedOnceRef.current = false;
    inputSubmittedRef.current = false;

    setPickedIndex(null);

    setSelSide(null);
    setSelIndex(null);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());

    setInputValue("");
  }, [qKey]);

  const optionsCount = useMemo(() => {
    if (type === "true_false") return 2;
    if (type === "multiple_choice") {
      const a = Array.isArray(q?.answers) ? q.answers : [];
      return Math.min(5, a.length);
    }
    return 0;
  }, [type, q]);

  const labels = useMemo(() => ABCDE.slice(0, Math.min(5, optionsCount)), [optionsCount]);

  function submitSingleChoice(idx: number) {
    if (disabled) return;
    if (submittedOnceRef.current) return;

    submittedOnceRef.current = true;
    setPickedIndex(idx);
    onSubmitChoice({ indices: [idx] });
  }

  const leftItems: string[] = useMemo(
    () => (Array.isArray(q?.left) ? q.left.map((x: any) => String(x ?? "")) : []),
    [q]
  );

  const rightItems: string[] = useMemo(
    () => (Array.isArray(q?.right) ? q.right.map((x: any) => String(x ?? "")) : []),
    [q]
  );

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
    } finally {
      setSelSide(null);
      setSelIndex(null);
      matchingBusyRef.current = false;
    }
  }

  function clickLeft(i: number) {
    if (disabled) return;
    if (matchedLeft.has(i)) return;

    if (selSide === "R" && selIndex !== null) {
      void tryMatch(i, selIndex);
      return;
    }
    setSelSide("L");
    setSelIndex(i);
  }

  function clickRight(i: number) {
    if (disabled) return;
    if (matchedRight.has(i)) return;

    if (selSide === "L" && selIndex !== null) {
      void tryMatch(selIndex, i);
      return;
    }
    setSelSide("R");
    setSelIndex(i);
  }

  function submitInput() {
    if (disabled) return;
    if (!onSubmitInput) return;
    if (inputSubmittedRef.current) return;

    const v = inputValue.trim();
    if (!v) return;

    inputSubmittedRef.current = true;
    onSubmitInput({ value: v });
  }

  const grad = `bg-gradient-to-br ${BADGE_ACCENT}`;

  if (type === "input") {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-3">
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
          <button
            type="button"
            disabled={disabled}
            onClick={submitInput}
            className={[
              "w-full rounded-2xl px-4 py-3 font-extrabold shadow-sm transition",
              "border border-slate-200/70 bg-white/80 hover:bg-white",
              "dark:border-slate-800/70 dark:bg-slate-950/35 dark:hover:bg-slate-950/55",
              disabled ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  if (type === "matching") {
    return (
      <div className="w-full">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Left</p>
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
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold border shadow-sm transition",
                    isSelected
                      ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25"
                      : "border-slate-200/70",
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

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Right</p>
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
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold border shadow-sm transition",
                    isSelected
                      ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25"
                      : "border-slate-200/70",
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
      </div>
    );
  }

  if (type === "true_false") {
    const tfLabels = ["T", "F"] as const;

    return (
      <div className="w-full">
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-lg sm:gap-4">
          {[0, 1].map((idx) => {
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
                <span className="text-white font-extrabold text-6xl sm:text-7xl">{tfLabels[idx]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-lg sm:gap-4 md:max-w-2xl md:gap-6">
        {labels.map((lab, idx) => {
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
              <span className="text-white font-extrabold text-6xl sm:text-7xl md:text-8xl">{lab}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
