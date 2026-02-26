"use client";

import { Question } from "@/src/lib/questionStorage";
import AnswerInput from "./AnswerInput";
import { Plus } from "lucide-react";
import { useEffect } from "react";

export default function MultipleChoiceEditor({
  question,
  onUpdate,
}: {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
}) {

  const MIN_CHOICES = 3;
  const MAX_CHOICES = 5;
  const answers = question.answers ?? [];
  const canAdd = answers.length < MAX_CHOICES;

  const isOdd = answers.length % 2 === 1;
  const correctCount = (answers ?? []).filter(a => !!a.correct).length;
  const showModeToggle = correctCount >= 2;

  function setAllowMultiple(v: boolean) {
    onUpdate({ allowMultiple: v });
  }

  function addAnswer() {
    if (!canAdd) return;
    onUpdate({
      answers: [...answers, { text: "", correct: false, image: undefined }],
    });
  }

  function removeAnswer(index: number) {
    if (answers.length <= MIN_CHOICES) return; // keep minimum 3
    onUpdate({ answers: answers.filter((_, i) => i !== index) });
  }

  useEffect(() => {
    if (showModeToggle && typeof question.allowMultiple !== "boolean") {
      onUpdate({ allowMultiple: false }); // default
    }
  }, [showModeToggle, question.allowMultiple, onUpdate]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Answers (multiple correct allowed)
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {showModeToggle && (
            <div className="inline-flex rounded-xl border border-slate-200/70 bg-white/70 p-1 dark:border-slate-800/70 dark:bg-slate-950/45">
              <button
                type="button"
                onClick={() => setAllowMultiple(false)}
                className={[
                  "rounded-lg px-3 py-2 text-xs font-semibold transition",
                  (question.allowMultiple ?? false)
                    ? "text-slate-600 dark:text-slate-300"
                    : "bg-[#00D4FF]/10 text-slate-900 dark:text-slate-50",
                ].join(" ")}
              >
                Choose ONE
              </button>

              <button
                type="button"
                onClick={() => setAllowMultiple(true)}
                className={[
                  "rounded-lg px-3 py-2 text-xs font-semibold transition",
                  (question.allowMultiple ?? false)
                    ? "bg-[#00D4FF]/10 text-slate-900 dark:text-slate-50"
                    : "text-slate-600 dark:text-slate-300",
                ].join(" ")}
              >
                Choose ALL
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={addAnswer}
            disabled={!canAdd}
            className="
              inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold
              border border-slate-200/80 bg-white/70 shadow-sm transition
              hover:bg-white
              disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white
              dark:border-slate-800/70 dark:bg-slate-950/40 dark:hover:bg-slate-950/70
            "
          >
            <Plus className="h-4 w-4" />
            {canAdd ? "Add choice" : `Max ${MAX_CHOICES} choices`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {answers.map((ans, i) => {
          const isLast = i === answers.length - 1;
          const centerLast = isOdd && isLast;

          return (
            <div
              key={i}
              className={centerLast ? "md:col-span-2 md:flex md:justify-center" : ""}
            >
              <div className={centerLast ? "md:w-[min(520px,48%)] w-full" : "w-full"}>
                <AnswerInput
                  index={i}
                  answer={ans}
                  onChange={(ansPatch) => {
                    const next = [...answers];
                    next[i] = { ...next[i], ...ansPatch };
                    onUpdate({ answers: next });
                  }}
                  onCorrect={() => {
                    const next = [...answers];
                    next[i] = { ...next[i], correct: !next[i].correct };
                    onUpdate({ answers: next });
                  }}
                  onRemove={answers.length > MIN_CHOICES ? () => removeAnswer(i) : undefined}
                />
              </div>
              
            </div>

          );
        })}
      </div>

    </div>
  );
}
