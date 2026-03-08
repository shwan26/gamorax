"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BADGE_ACCENT, PICK_BTN_BASE } from "@/src/styles/answerStyles";

const ABCDE = ["A", "B", "C", "D", "E"] as const;

type QType = "multiple_choice" | "true_false" | "matching" | "input";
type Mode = "live" | "assignment";

type Pair = { left: string; right: string };

type Props = {
  q: any;
  disabled: boolean;
  mode?: Mode;

  onSubmitChoice: (payload: { indices: number[] }) => void;
  onAttemptMatch?: (payload: { leftIndex: number; rightIndex: number }) => Promise<{ correct: boolean }>;
  onSubmitInput?: (payload: { value: string }) => void;
  onSubmitMatching?: (payload: { pairs: Pair[] }) => void;
};

function safeInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export default function AnswerGrid({
  q,
  disabled,
  mode = "live",
  onSubmitChoice,
  onAttemptMatch,
  onSubmitInput,
  onSubmitMatching,
}: Props) {
  const type = (q?.type ?? "multiple_choice") as QType;
  const showFull = mode === "assignment";
  const isAssignment = mode === "assignment";

  // ---------- choice state ----------
  const [pickedSet, setPickedSet] = useState<Set<number>>(() => new Set());
  const submittedOnceRef = useRef(false);

  // ---------- matching state ----------
  // Live mode: tracks which indices are correctly matched (green lock)
  const [matchedLeft, setMatchedLeft] = useState<Set<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<Set<number>>(() => new Set());

  // Assignment mode: tracks the chosen pair for each left item (index → right index)
  // A left item can be "connected" to a right item freely, and changed before submit
  const [assignPairs, setAssignPairs] = useState<Map<number, number>>(() => new Map());
  const [matchingSubmitted, setMatchingSubmitted] = useState(false);

  const [selSide, setSelSide] = useState<"L" | "R" | null>(null);
  const [selIndex, setSelIndex] = useState<number | null>(null);

  // ---------- live wrong-flash state ----------
  const [wrongLeft, setWrongLeft] = useState<number | null>(null);
  const [wrongRight, setWrongRight] = useState<number | null>(null);
  const wrongTimerRef = useRef<number | null>(null);

  // ---------- input state ----------
  const [inputValue, setInputValue] = useState("");
  const inputSubmittedRef = useRef(false);

  // ---------- live matching pairs ref (for auto-submit) ----------
  const pairsRef = useRef<Pair[]>([]);
  const matchingBusyRef = useRef(false);

  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const qKey = `${q?.questionIndex ?? ""}|${q?.id ?? ""}|${type}`;

  // Reset all state on question change
  useEffect(() => {
    submittedOnceRef.current = false;
    inputSubmittedRef.current = false;

    setPickedSet(new Set());
    setSelSide(null);
    setSelIndex(null);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());
    setAssignPairs(new Map());
    setMatchingSubmitted(false);
    setInputValue("");
    pairsRef.current = [];
    matchingBusyRef.current = false;

    setWrongLeft(null);
    setWrongRight(null);
    if (wrongTimerRef.current) {
      window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
  }, [qKey]);

  // ---------- answers (MC/TF) ----------
  const answers = useMemo(() => {
    const raw =
      (Array.isArray(q?.answers) && q.answers) ||
      (Array.isArray(q?.choices) && q.choices) ||
      (Array.isArray(q?.options) && q.options) ||
      [];
    return raw.map((x: any) => {
      if (typeof x === "string") return { text: x };
      if (x && typeof x === "object") {
        if ("text" in x || "image" in x) return x;
        return { text: String(x.label ?? x.value ?? ""), image: x.image };
      }
      return { text: String(x ?? "") };
    });
  }, [q]);

  const optionsCount = useMemo(() => {
    if (type === "true_false") return 2;
    if (type === "multiple_choice") return Math.min(5, answers.length);
    return 0;
  }, [type, answers.length]);

  const labels = useMemo(() => ABCDE.slice(0, Math.min(5, optionsCount)), [optionsCount]);

  const allowMultiple = useMemo(() => {
    if (type !== "multiple_choice") return false;
    if (typeof q?.allowMultiple === "boolean") return q.allowMultiple;
    const correctIndices = Array.isArray(q?.correctIndices) ? q.correctIndices : [];
    return correctIndices.filter((x: any) => Number.isFinite(Number(x))).length > 1;
  }, [q?.allowMultiple, q?.correctIndices, type]);

  const requiredPickCount = useMemo(() => {
    if (type === "true_false") return 1;
    if (type === "multiple_choice") {
      const cc = safeInt(q?.correctCount, -1);
      if (cc > 0) return cc;
      const ci = Array.isArray(q?.correctIndices) ? q.correctIndices : [];
      const n = ci.filter((x: any) => Number.isFinite(Number(x))).length;
      if (n > 0) return n;
      return allowMultiple ? 0 : 1;
    }
    return 0;
  }, [q?.correctCount, q?.correctIndices, type, allowMultiple]);

  const hintText = useMemo(() => {
    if (type === "true_false") return "Choose 1 answer";
    if (type === "multiple_choice") {
      if (!allowMultiple) return "Choose 1 answer";
      if (requiredPickCount > 0) return `Choose ${requiredPickCount} answers`;
      return "Choose 1+ answers";
    }
    return "";
  }, [type, allowMultiple, requiredPickCount]);

  const canSubmitChoice = useMemo(() => {
    if (disabled || submittedOnceRef.current) return false;
    const n = pickedSet.size;
    if (n === 0) return false;
    if (requiredPickCount > 0) return n === requiredPickCount;
    return true;
  }, [disabled, pickedSet, requiredPickCount]);

  // ---------- matching items (shuffled for assignment) ----------
  const leftBase: string[] = useMemo(
    () => (Array.isArray(q?.left) ? q.left.map((x: any) => String(x ?? "")) : []),
    [q?.id, q?.questionIndex, q?.left]
  );
  const rightBase: string[] = useMemo(
    () => (Array.isArray(q?.right) ? q.right.map((x: any) => String(x ?? "")) : []),
    [q?.id, q?.questionIndex, q?.right]
  );

  const [assLeft, setAssLeft] = useState<string[]>([]);
  const [assRight, setAssRight] = useState<string[]>([]);

  useEffect(() => {
    if (type !== "matching") return;
    if (isAssignment) {
      setAssLeft(shuffle(leftBase));
      setAssRight(shuffle(rightBase));
    } else {
      setAssLeft(leftBase);
      setAssRight(rightBase);
    }
  }, [isAssignment, type, qKey, leftBase.join("|"), rightBase.join("|")]);

  const leftItems = assLeft;
  const rightItems = assRight;

  // ---------- choice handlers ----------
  function togglePick(idx: number) {
    if (disabled || submittedOnceRef.current) return;
    if (type === "true_false" || !allowMultiple) {
      setPickedSet(new Set([idx]));
      return;
    }
    setPickedSet((prev) => {
      const nx = new Set(prev);
      if (nx.has(idx)) nx.delete(idx);
      else nx.add(idx);
      return nx;
    });
  }

  function submitChoice() {
    if (disabled || submittedOnceRef.current) return;
    const indices = Array.from(pickedSet).sort((a, b) => a - b);
    if (indices.length === 0) return;
    if (requiredPickCount > 0 && indices.length !== requiredPickCount) return;
    submittedOnceRef.current = true;
    onSubmitChoice({ indices });
  }

  // ---------- flash wrong (live matching) ----------
  function flashWrong(leftIndex: number | null, rightIndex: number | null) {
    if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current);
    setWrongLeft(leftIndex);
    setWrongRight(rightIndex);
    wrongTimerRef.current = window.setTimeout(() => {
      setWrongLeft(null);
      setWrongRight(null);
      wrongTimerRef.current = null;
    }, 450);
  }

  // ---------- LIVE matching ----------
  async function tryMatchLive(leftIndex: number, rightIndex: number) {
    if (disabled || !onAttemptMatch || matchingBusyRef.current) return;

    const left = leftItems[leftIndex] ?? "";
    const right = rightItems[rightIndex] ?? "";
    if (!left || !right) return;

    matchingBusyRef.current = true;
    try {
      const res = await onAttemptMatch({ leftIndex, rightIndex });

      if (!res?.correct) {
        flashWrong(leftIndex, rightIndex);
        setSelSide(null);
        setSelIndex(null);
        return;
      }

      setMatchedLeft((prev) => new Set([...prev, leftIndex]));
      setMatchedRight((prev) => new Set([...prev, rightIndex]));

      const nextPairs: Pair[] = [
        ...pairsRef.current.filter((p) => p.left !== left),
        { left, right },
      ];
      pairsRef.current = nextPairs;

      if (nextPairs.length === leftItems.length) {
        queueMicrotask(() => onSubmitMatching?.({ pairs: nextPairs }));
      }
    } finally {
      setSelSide(null);
      setSelIndex(null);
      matchingBusyRef.current = false;
    }
  }

  // ---------- ASSIGNMENT matching ----------
  // Any left can be freely paired with any right — no validation until Submit
  function tryMatchAssignment(leftIndex: number, rightIndex: number) {
    if (disabled || matchingSubmitted) return;

    setAssignPairs((prev) => {
      const next = new Map(prev);
      // If right is already taken by another left, unassign it first
      for (const [li, ri] of next.entries()) {
        if (ri === rightIndex && li !== leftIndex) next.delete(li);
      }
      next.set(leftIndex, rightIndex);
      return next;
    });
    setSelSide(null);
    setSelIndex(null);
  }

  function clickLeft(i: number) {
    if (disabled) return;

    if (isAssignment) {
      if (matchingSubmitted) return;
      if (selSide === "R" && selIndex !== null) {
        tryMatchAssignment(i, selIndex);
        return;
      }
      // Toggle off if clicking the already-selected left
      if (selSide === "L" && selIndex === i) {
        setSelSide(null);
        setSelIndex(null);
        return;
      }
      setSelSide("L");
      setSelIndex(i);
      return;
    }

    // Live mode
    if (matchedLeft.has(i)) return;
    if (selSide === "R" && selIndex !== null) {
      void tryMatchLive(i, selIndex);
      return;
    }
    setSelSide("L");
    setSelIndex(i);
  }

  function clickRight(i: number) {
    if (disabled) return;

    if (isAssignment) {
      if (matchingSubmitted) return;
      if (selSide === "L" && selIndex !== null) {
        tryMatchAssignment(selIndex, i);
        return;
      }
      // Toggle off if clicking the already-selected right
      if (selSide === "R" && selIndex === i) {
        setSelSide(null);
        setSelIndex(null);
        return;
      }
      setSelSide("R");
      setSelIndex(i);
      return;
    }

    // Live mode
    if (matchedRight.has(i)) return;
    if (selSide === "L" && selIndex !== null) {
      void tryMatchLive(selIndex, i);
      return;
    }
    setSelSide("R");
    setSelIndex(i);
  }

  function submitMatching() {
    if (disabled || matchingSubmitted) return;
    if (assignPairs.size !== leftItems.length) return;

    const pairs: Pair[] = Array.from(assignPairs.entries()).map(([li, ri]) => ({
      left: leftItems[li] ?? "",
      right: rightItems[ri] ?? "",
    }));

    setMatchingSubmitted(true);
    onSubmitMatching?.({ pairs });
  }

  // ---------- input ----------
  function submitInput() {
    if (disabled || !onSubmitInput || inputSubmittedRef.current) return;
    const v = inputValue.trim();
    if (!v) return;
    inputSubmittedRef.current = true;
    onSubmitInput({ value: v });
  }

  const grad = `bg-gradient-to-br ${BADGE_ACCENT}`;
  const blueDefault = "bg-[#2563EB]";
  const pickBase = [
    PICK_BTN_BASE,
    blueDefault,
    "shadow-[0_10px_25px_rgba(37,99,235,0.18)]",
    "hover:brightness-110",
  ].join(" ");
  const pickSelected = [PICK_BTN_BASE, grad, "brightness-110 ring-4 ring-white/70"].join(" ");

  /* -------------------- INPUT -------------------- */
  if (type === "input") {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-3">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitInput(); }}
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
            disabled={disabled || inputSubmittedRef.current || !inputValue.trim()}
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

  /* -------------------- MATCHING -------------------- */
  if (type === "matching") {
    const allPaired = assignPairs.size === leftItems.length && leftItems.length > 0;

    return (
      <div className="w-full space-y-4">
        {/* hint */}
        {isAssignment && (
          <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {matchingSubmitted
              ? "Submitted ✓"
              : allPaired
              ? "All paired — tap Submit when ready"
              : `Select a left item, then a right item to pair them (${assignPairs.size}/${leftItems.length})`}
          </p>
        )}

        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-4">
          {/* LEFT column */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Left</p>
            {leftItems.map((t, i) => {
              const isWrong = wrongLeft === i;
              const pairedRightIdx = assignPairs.get(i);
              const isPaired = pairedRightIdx !== undefined; // assignment
              const isMatchedLive = matchedLeft.has(i); // live
              const isSelected = selSide === "L" && selIndex === i;

              let cls = "border-slate-200/70 bg-white/80";
              if (isAssignment) {
                if (matchingSubmitted) cls = isPaired ? "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-500/10" : "border-slate-200/70 bg-white/80";
                else if (isSelected) cls = "border-[#2563EB] ring-2 ring-[#2563EB]/35 bg-[#2563EB]/10";
                else if (isPaired) cls = "border-sky-400 ring-1 ring-sky-400/30 bg-sky-50/80 dark:bg-sky-950/20";
              } else {
                if (isWrong) cls = "border-rose-500 ring-2 ring-rose-500/25 bg-rose-500/10 animate-[shake_0.25s_ease-in-out_1]";
                else if (isMatchedLive) cls = "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-500/10";
                else if (isSelected) cls = "border-[#2563EB] ring-2 ring-[#2563EB]/35 bg-[#2563EB]/10";
              }

              const isLocked = isAssignment ? matchingSubmitted : isMatchedLive;

              return (
                <button
                  key={`L-${i}`}
                  type="button"
                  disabled={disabled || isLocked}
                  onClick={() => clickLeft(i)}
                  className={[
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold border shadow-sm transition",
                    cls,
                    "dark:border-slate-800/70 dark:bg-slate-950/45",
                    isLocked ? "opacity-60 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
                    disabled ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <span>{t || `Left ${i + 1}`}</span>
                  {/* show paired label in assignment mode */}
                  {isAssignment && isPaired && !matchingSubmitted && (
                    <span className="ml-2 text-[10px] font-bold text-sky-500 dark:text-sky-400">
                      → {rightItems[pairedRightIdx!] ?? "?"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* RIGHT column */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Right</p>
            {rightItems.map((t, i) => {
              const isWrong = wrongRight === i;
              const isTaken = isAssignment && Array.from(assignPairs.values()).includes(i);
              const isMatchedLive = matchedRight.has(i);
              const isSelected = selSide === "R" && selIndex === i;

              let cls = "border-slate-200/70 bg-white/80";
              if (isAssignment) {
                if (matchingSubmitted) cls = isTaken ? "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-500/10" : "border-slate-200/70 bg-white/80";
                else if (isSelected) cls = "border-[#2563EB] ring-2 ring-[#2563EB]/35 bg-[#2563EB]/10";
                else if (isTaken) cls = "border-sky-400 ring-1 ring-sky-400/30 bg-sky-50/80 dark:bg-sky-950/20";
              } else {
                if (isWrong) cls = "border-rose-500 ring-2 ring-rose-500/25 bg-rose-500/10 animate-[shake_0.25s_ease-in-out_1]";
                else if (isMatchedLive) cls = "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-500/10";
                else if (isSelected) cls = "border-[#2563EB] ring-2 ring-[#2563EB]/35 bg-[#2563EB]/10";
              }

              const isLocked = isAssignment ? matchingSubmitted : isMatchedLive;

              return (
                <button
                  key={`R-${i}`}
                  type="button"
                  disabled={disabled || isLocked}
                  onClick={() => clickRight(i)}
                  className={[
                    "w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold border shadow-sm transition",
                    cls,
                    "dark:border-slate-800/70 dark:bg-slate-950/45",
                    isLocked ? "opacity-60 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
                    disabled ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {t || `Right ${i + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignment: Submit button */}
        {isAssignment && !matchingSubmitted && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              disabled={disabled || !allPaired}
              onClick={submitMatching}
              className={[
                "rounded-full px-10 py-3 text-sm font-semibold text-white",
                "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
                "shadow-[0_10px_25px_rgba(37,99,235,0.18)]",
                "hover:opacity-95 active:scale-[0.99] transition",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
              ].join(" ")}
            >
              Submit matching
            </button>
          </div>
        )}
      </div>
    );
  }

  /* -------------------- TRUE/FALSE -------------------- */
  if (type === "true_false") {
    const tfLabels = ["T", "F"] as const;
    const tfText = ["True", "False"];

    return (
      <div className="w-full">
        <div className="mx-auto mb-3 w-full max-w-lg text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
          {hintText}
        </div>

        {!showFull ? (
          <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-lg sm:gap-4">
            {[0, 1].map((idx) => {
              const isSelected = pickedSet.has(idx);
              const dimClass = pickedSet.size > 0 && !isSelected ? "opacity-40" : "opacity-100";
              return (
                <button
                  key={idx}
                  disabled={disabled || submittedOnceRef.current}
                  onClick={() => togglePick(idx)}
                  type="button"
                  className={[
                    isSelected ? pickSelected : pickBase,
                    "min-h-[120px] sm:min-h-[140px]",
                    dimClass,
                    disabled ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <span className="text-white font-extrabold text-6xl sm:text-7xl">{tfLabels[idx]}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {[0, 1].map((idx) => {
              const isSelected = pickedSet.has(idx);
              return (
                <button
                  key={idx}
                  disabled={disabled || submittedOnceRef.current}
                  onClick={() => togglePick(idx)}
                  type="button"
                  className={[
                    "w-full min-h-[96px] rounded-2xl border px-4 py-3 text-left shadow-sm transition",
                    isSelected ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25" : "border-slate-200/70",
                    "bg-white/80 hover:bg-white dark:bg-slate-950/45 dark:border-slate-800/70 dark:hover:bg-slate-950/60",
                    disabled ? "opacity-70 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white bg-gradient-to-br from-[#00D4FF] via-[#38BDF8] to-[#2563EB]">
                      {idx === 0 ? "T" : "F"}
                    </span>
                    <div className="min-w-0">
                      <div className="text-base font-extrabold text-slate-900 dark:text-slate-50">{tfText[idx]}</div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tap to select</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={!canSubmitChoice}
            onClick={submitChoice}
            className={[
              "rounded-full px-10 py-3 text-sm font-semibold text-white",
              "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
              "shadow-[0_10px_25px_rgba(37,99,235,0.18)]",
              "hover:opacity-95 active:scale-[0.99] transition",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
            ].join(" ")}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  /* -------------------- MULTIPLE CHOICE -------------------- */
  return (
    <div className="w-full">
      <div className="mx-auto mb-3 w-full max-w-3xl text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
        {hintText}
      </div>

      {!showFull ? (
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-lg sm:gap-4 md:max-w-2xl md:gap-6">
          {labels.map((lab, idx) => {
            const isSelected = pickedSet.has(idx);
            const dimClass = pickedSet.size > 0 && !isSelected ? "opacity-40" : "opacity-100";
            return (
              <button
                key={idx}
                disabled={disabled || submittedOnceRef.current}
                onClick={() => togglePick(idx)}
                type="button"
                className={[
                  isSelected ? pickSelected : pickBase,
                  "min-h-[120px] sm:min-h-[140px] md:min-h-[170px]",
                  dimClass,
                  disabled ? "opacity-70 cursor-not-allowed" : "",
                ].join(" ")}
                aria-pressed={isSelected}
              >
                <span className="text-white font-extrabold text-6xl sm:text-7xl md:text-8xl">{lab}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-3 sm:gap-4">
          {labels.map((lab, idx) => {
            const a = answers[idx] ?? {};
            const text = String(a?.text ?? "").trim();
            const img = a?.image ? String(a.image) : "";
            const isSelected = pickedSet.has(idx);
            return (
              <button
                key={idx}
                disabled={disabled || submittedOnceRef.current}
                onClick={() => togglePick(idx)}
                type="button"
                className={[
                  "w-full rounded-2xl border p-4 text-left shadow-sm transition",
                  isSelected ? "border-[#00D4FF]/60 ring-2 ring-[#00D4FF]/25" : "border-slate-200/70",
                  "bg-white/80 hover:bg-white dark:bg-slate-950/45 dark:border-slate-800/70 dark:hover:bg-slate-950/60",
                  disabled ? "opacity-70 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white bg-gradient-to-br from-[#00D4FF] via-[#38BDF8] to-[#2563EB]">
                    {lab}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                      {text || `Option ${lab}`}
                    </div>
                    {img ? (
                      <img
                        src={img}
                        alt={`Option ${lab}`}
                        className="mt-2 max-h-40 rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40"
                      />
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          disabled={!canSubmitChoice}
          onClick={submitChoice}
          className={[
            "rounded-full px-10 py-3 text-sm font-semibold text-white",
            "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
            "shadow-[0_10px_25px_rgba(37,99,235,0.18)]",
            "hover:opacity-95 active:scale-[0.99] transition",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          ].join(" ")}
        >
          Submit
        </button>
      </div>
    </div>
  );
}