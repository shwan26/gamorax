"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BADGE_ACCENT, PICK_BTN_BASE } from "@/src/styles/answerStyles";

const MC_LABELS = ["A", "B", "C", "D", "E"] as const;

type QType = "multiple_choice" | "true_false" | "matching" | "input";

type Props = {
  q: any;
  disabled: boolean;

  // Multiple choice / TrueFalse
  onSubmitChoice: (payload: { indices: number[] }) => void;

  // Matching (optional)
  onAttemptMatch?: (payload: {
    leftIndex: number;
    rightIndex: number;
  }) => Promise<{ correct: boolean }>;

  // Input (optional)
  onSubmitInput?: (payload: { value: string }) => void;

  /**
   * Optional: if you want to locally add “+1” when a match is correct
   * (e.g., show some score UI on the student page).
   */
  onMatchCorrect?: () => void;
};

export default function AnswerGrid({
  q,
  disabled,
  onSubmitChoice,
  onAttemptMatch,
  onSubmitInput,
  onMatchCorrect,
}: Props) {
  const type = (q?.type ?? "multiple_choice") as QType;

  /* =======================
     MULTIPLE CHOICE / TRUEFALSE
  ======================== */

  const options: string[] = useMemo(() => {
    if (type === "true_false") return ["True", "False"];
    if (type === "multiple_choice") return Array.isArray(q?.answers) ? q.answers : [];
    return [];
  }, [type, q]);

  const allowMultiple = type === "multiple_choice" && Boolean(q?.allowMultiple);

  const [picked, setPicked] = useState<number[]>([]);
  const submittedOnceRef = useRef(false);

  // reset internal state when question changes
  useEffect(() => {
    setPicked([]);
    submittedOnceRef.current = false;
  }, [q?.questionIndex, q?.id, type]);

  function togglePick(idx: number) {
    if (disabled) return;
    if (submittedOnceRef.current) return;

    // ✅ Single-choice: click once = submit immediately
    if (!allowMultiple) {
      submittedOnceRef.current = true;
      setPicked([idx]);
      onSubmitChoice({ indices: [idx] });
      return;
    }

    // Multi-select: allow toggling then press submit
    setPicked((prev) => {
      if (prev.includes(idx)) return prev.filter((x) => x !== idx);
      return [...prev, idx];
    });
  }

  function submitChoice() {
    if (disabled) return;
    if (submittedOnceRef.current) return;
    if (!picked.length) return;

    submittedOnceRef.current = true;
    onSubmitChoice({ indices: picked });
  }

  /* =======================
     MATCHING
  ======================== */

  const leftItems: string[] = useMemo(() => (Array.isArray(q?.left) ? q.left : []), [q]);
  const rightItems: string[] = useMemo(() => (Array.isArray(q?.right) ? q.right : []), [q]);

  const [matchedLeft, setMatchedLeft] = useState<Set<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<Set<number>>(() => new Set());
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const matchingBusyRef = useRef(false);

  useEffect(() => {
    setMatchedLeft(new Set());
    setMatchedRight(new Set());
    setSelL(null);
    setSelR(null);
    matchingBusyRef.current = false;
  }, [q?.questionIndex, q?.id, type]);

  async function tryMatch(l: number, r: number) {
    if (disabled) return;
    if (matchingBusyRef.current) return;

    // if no handler, treat as incorrect (does nothing)
    if (!onAttemptMatch) {
      setSelL(null);
      setSelR(null);
      return;
    }

    matchingBusyRef.current = true;
    try {
      const res = await onAttemptMatch({ leftIndex: l, rightIndex: r });

      if (res?.correct) {
        // ✅ correct: dim (keep visible but muted)
        setMatchedLeft((prev) => {
          const nx = new Set(prev);
          nx.add(l);
          return nx;
        });
        setMatchedRight((prev) => {
          const nx = new Set(prev);
          nx.add(r);
          return nx;
        });

        // optional +1
        onMatchCorrect?.();
      }

      // incorrect: nothing changes (except selection resets)
    } finally {
      setSelL(null);
      setSelR(null);
      matchingBusyRef.current = false;
    }
  }

  /* =======================
     INPUT
  ======================== */

  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setInputValue("");
  }, [q?.questionIndex, q?.id, type]);

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

  // ---------- INPUT ----------
  if (type === "input") {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-md sm:max-w-lg">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setInputValue("")}
              disabled={disabled || inputValue.length === 0}
              className="
                w-full rounded-2xl px-4 py-3 text-sm font-semibold
                border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm
                hover:bg-white active:scale-[0.99] transition
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-200
              "
            >
              Clear
            </button>

            <button
              type="button"
              onClick={submitInput}
              disabled={disabled || !inputValue.trim() || !onSubmitInput}
              className="
                w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white
                bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                shadow-sm hover:opacity-95 active:scale-[0.99] transition
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
              "
            >
              Submit
            </button>
          </div>

          {!onSubmitInput ? (
            <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-300">
              Input submit handler is not wired yet.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // ---------- MATCHING ----------
  if (type === "matching") {
    return (
      <div className="w-full">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-4">
          {/* LEFT */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Word L</p>

            {leftItems.map((t, i) => {
              const alreadyMatched = matchedLeft.has(i);
              const selected = selL === i;

              return (
                <button
                  key={`L-${i}`}
                  type="button"
                  disabled={disabled || alreadyMatched}
                  onClick={() => {
                    if (disabled || alreadyMatched) return;
                    setSelL(i);
                    if (selR !== null) tryMatch(i, selR);
                  }}
                  className={[
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold",
                    "border shadow-sm transition",
                    selected ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25" : "border-slate-200/70",
                    "bg-white/80 dark:bg-slate-950/45 dark:border-slate-800/70",
                    alreadyMatched ? "opacity-35 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
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
              const alreadyMatched = matchedRight.has(i);
              const selected = selR === i;

              return (
                <button
                  key={`R-${i}`}
                  type="button"
                  disabled={disabled || alreadyMatched}
                  onClick={() => {
                    if (disabled || alreadyMatched) return;
                    setSelR(i);
                    if (selL !== null) tryMatch(selL, i);
                  }}
                  className={[
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold",
                    "border shadow-sm transition",
                    selected ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25" : "border-slate-200/70",
                    "bg-white/80 dark:bg-slate-950/45 dark:border-slate-800/70",
                    alreadyMatched ? "opacity-35 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
                    disabled ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {t || `Right ${i + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Tap one from <b>Word L</b> and one from <b>Word R</b>. Incorrect = no change. Correct = dim.
        </p>

        {!onAttemptMatch ? (
          <p className="mt-1 text-center text-xs text-amber-600 dark:text-amber-300">
            Matching handler is not wired yet.
          </p>
        ) : null}
      </div>
    );
  }

  // ---------- MULTIPLE CHOICE / TRUE-FALSE ----------
  const labels = type === "true_false" ? (["T", "F"] as const) : MC_LABELS.slice(0, options.length);
  const hasPicked = picked.length > 0;

  return (
    <div className="w-full">
      <div
        className="
          mx-auto grid w-full max-w-md grid-cols-2 gap-3
          sm:max-w-lg sm:gap-4
          md:max-w-2xl md:gap-6
        "
      >
        {options.map((text, idx) => {
          const isSelected = picked.includes(idx);
          const dimClass = hasPicked && !isSelected ? "opacity-40" : "opacity-100";
          const selected = isSelected ? "brightness-110 ring-4 ring-white/70" : "";

          return (
            <button
              key={idx}
              disabled={disabled || submittedOnceRef.current}
              onClick={() => togglePick(idx)}
              type="button"
              className={[
                PICK_BTN_BASE,
                "min-h-[120px] sm:min-h-[140px] md:min-h-[170px]",
                grad,
                selected,
                dimClass,
                disabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer",
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

      {/* Submit only for multi-select */}
      {allowMultiple ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={submitChoice}
            disabled={disabled || picked.length === 0 || submittedOnceRef.current}
            className="
              inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold text-white
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
              shadow-[0_10px_25px_rgba(37,99,235,0.18)]
              hover:opacity-95 active:scale-[0.99] transition
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
            "
          >
            Submit
          </button>
        </div>
      ) : null}
    </div>
  );
}
