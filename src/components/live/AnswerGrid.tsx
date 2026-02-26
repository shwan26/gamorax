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

  // For choice questions: we now support "select + submit"
  const [pickedIndex, setPickedIndex] = useState<number | null>(null); // for single visual
  const [pickedSet, setPickedSet] = useState<Set<number>>(() => new Set()); // for multi + single (unified)
  const submittedOnceRef = useRef(false);

  const [matchedLeft, setMatchedLeft] = useState<Set<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<Set<number>>(() => new Set());
  const [selSide, setSelSide] = useState<"L" | "R" | null>(null);
  const [selIndex, setSelIndex] = useState<number | null>(null);

  const [inputValue, setInputValue] = useState("");
  const inputSubmittedRef = useRef(false);

  const [pairs, setPairs] = useState<Pair[]>([]);
  const pairsRef = useRef<Pair[]>([]);
  const matchingSubmittedRef = useRef(false);

  const isAssignment = mode === "assignment";

  useEffect(() => {
    pairsRef.current = pairs;
  }, [pairs]);

  const qKey = `${q?.questionIndex ?? ""}|${q?.id ?? ""}|${type}`;

  useEffect(() => {
    submittedOnceRef.current = false;
    inputSubmittedRef.current = false;

    setPickedIndex(null);
    setPickedSet(new Set());

    setSelSide(null);
    setSelIndex(null);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());

    setInputValue("");

    setPairs([]);
    pairsRef.current = [];
    matchingSubmittedRef.current = false;
  }, [qKey]);

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

  // ✅ allowMultiple for MC comes from teacher config (recommended)
  // fallback: if q.allowMultiple missing but there are multiple correct indices, treat as multiple
  const allowMultiple = useMemo(() => {
    if (type !== "multiple_choice") return false;

    if (typeof q?.allowMultiple === "boolean") return q.allowMultiple;

    const correctIndices = Array.isArray(q?.correctIndices) ? q.correctIndices : [];
    const correctCountFromIndices = correctIndices.filter((x: any) => Number.isFinite(Number(x))).length;
    return correctCountFromIndices > 1;
  }, [q?.allowMultiple, q?.correctIndices, type]);

  // ✅ required picks (to show “choose N” + to enable Submit)
  // priority:
  // 1) q.correctCount
  // 2) q.correctIndices length
  // else: single=1, multi=0 (unknown)
  const requiredPickCount = useMemo(() => {
    if (type === "true_false") return 1;

    if (type === "multiple_choice") {
      const cc = safeInt(q?.correctCount, -1);
      if (cc > 0) return cc;

      const ci = Array.isArray(q?.correctIndices) ? q.correctIndices : [];
      const n = ci.filter((x: any) => Number.isFinite(Number(x))).length;
      if (n > 0) return n;

      // unknown
      return allowMultiple ? 0 : 1;
    }

    return 0;
  }, [q?.correctCount, q?.correctIndices, type, allowMultiple]);

  function togglePick(idx: number) {
    if (disabled) return;
    if (submittedOnceRef.current) return;

    // TF is always single selection
    if (type === "true_false" || !allowMultiple) {
      setPickedIndex(idx);
      setPickedSet(new Set([idx]));
      return;
    }

    // multi-select MC
    setPickedSet((prev) => {
      const nx = new Set(prev);
      if (nx.has(idx)) nx.delete(idx);
      else nx.add(idx);
      return nx;
    });
  }

  function submitChoice() {
    if (disabled) return;
    if (submittedOnceRef.current) return;

    const indices = Array.from(pickedSet).sort((a, b) => a - b);

    if (indices.length === 0) return;

    // enforce required count if known (>0)
    if (requiredPickCount > 0 && indices.length !== requiredPickCount) return;

    submittedOnceRef.current = true;
    onSubmitChoice({ indices });
  }

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

    // if required count is known, enforce exact match
    if (requiredPickCount > 0) return n === requiredPickCount;

    // unknown required => allow submit
    return true;
  }, [disabled, pickedSet, requiredPickCount]);

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

    const left = leftItems[leftIndex] ?? "";
    const right = rightItems[rightIndex] ?? "";
    if (!left || !right) return;

    matchingBusyRef.current = true;
    try {
      const res = await onAttemptMatch({ leftIndex, rightIndex });
      if (!res?.correct) return;

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

      const nextPairs: Pair[] = [
        ...pairsRef.current.filter((p) => p.left !== left),
        { left, right },
      ];

      pairsRef.current = nextPairs;
      setPairs(nextPairs);

      const required = leftItems.length;

      if (
        mode === "assignment" &&
        !matchingSubmittedRef.current &&
        required > 0 &&
        nextPairs.length === required
      ) {
        matchingSubmittedRef.current = true;
        queueMicrotask(() => {
          onSubmitMatching?.({ pairs: nextPairs });
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

    // ✅ default = solid blue, selected = gradient
    const blueDefault = "bg-[#2563EB]"; // tailwind blue-600 (solid)
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
                    // ✅ selected highlight (distinct)
                    isSelected
                      ? "border-[#2563EB] ring-2 ring-[#2563EB]/35 bg-[#2563EB]/10"
                      : "border-slate-200/70 bg-white/80",
                    // ✅ matched/correct state (green border)
                    isMatched ? "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-500/10" : "",
                    "dark:border-slate-800/70 dark:bg-slate-950/45",
                    // keep hover only if not matched
                    isMatched ? "opacity-60 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
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
                      ? "border-[#2563EB] ring-2 ring-[#2563EB]/35 bg-[#2563EB]/10"
                      : "border-slate-200/70 bg-white/80",
                    isMatched ? "border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-500/10" : "",
                    "dark:border-slate-800/70 dark:bg-slate-950/45",
                    isMatched ? "opacity-60 cursor-not-allowed" : "hover:bg-white dark:hover:bg-slate-950/60",
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

  /* -------------------- TRUE/FALSE -------------------- */
  if (type === "true_false") {
    const tfLabels = ["T", "F"] as const;
    const tfText = ["True", "False"];

    return (
      <div className="w-full">
        {/* hint */}
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
                    <span
                      className={[
                        "inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white",
                        "bg-gradient-to-br from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
                      ].join(" ")}
                    >
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

        {/* submit */}
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
  // Show hint + grid + submit
  return (
    <div className="w-full">
      {/* hint */}
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
                  <span
                    className={[
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white",
                      "bg-gradient-to-br from-[#00D4FF] via-[#38BDF8] to-[#2563EB]",
                    ].join(" ")}
                  >
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
                        className="
                          mt-2 max-h-40 rounded-xl border border-slate-200/70 bg-white shadow-sm
                          dark:border-slate-800/70 dark:bg-slate-950/40
                        "
                      />
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* submit */}
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