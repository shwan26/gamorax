"use client";

import { Question } from "@/src/lib/questionStorage";
import AnswerInput from "./AnswerInput";
import { Plus } from "lucide-react";

const MAX_CHOICES = 5;

export default function MultipleChoiceEditor({
  question,
  onUpdate,
}: {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
}) {
  const answers = question.answers ?? [];
  const canAdd = answers.length < MAX_CHOICES;

  function addAnswer() {
    if (!canAdd) return;
    onUpdate({
      answers: [...answers, { text: "", correct: false, image: undefined }],
    });
  }

  function removeAnswer(index: number) {
    if (answers.length <= 2) return; // keep minimum 2
    onUpdate({
      answers: answers.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Answers (multiple correct allowed)
        </p>

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
            dark:disabled:hover:bg-slate-950/40
          "
        >
          <Plus className="h-4 w-4" />
          {canAdd ? "Add choice" : `Max ${MAX_CHOICES} choices`}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {answers.map((ans, i) => (
          <AnswerInput
            key={i}
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
            onRemove={answers.length > 2 ? () => removeAnswer(i) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
