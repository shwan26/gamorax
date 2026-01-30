"use client";

import { Question, QuestionType } from "@/src/lib/questionStorage";
import { ImagePlus, Trash2, Timer } from "lucide-react";

import MultipleChoiceEditor from "./MulipleChoiceEditor";
import TrueFalseEditor from "./TrueFalseEditor";
import MatchingEditor from "./MatchingEditor";
import InputAnswerEditor from "./InputAnswerEditor";

function makeMCAnswers(n = 4) {
  return Array.from({ length: n }, () => ({ text: "", correct: false, image: undefined }));
}

export default function QuestionEditorForm({
  question,
  gameDefaultTime,
  onUpdate,
}: {
  question: Question;
  gameDefaultTime: number;
  onUpdate: (patch: Partial<Question>) => void;
}) {
  function handleQuestionImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ image: reader.result as string });
    reader.readAsDataURL(file);
  }

  function handleDeleteQuestionImage() {
    onUpdate({ image: null });
  }

  function switchType(nextType: QuestionType) {
    if (nextType === "multiple_choice") {
      onUpdate({
        type: nextType,
        answers: question.answers?.length ? question.answers : makeMCAnswers(4),
      });
      return;
    }

    if (nextType === "true_false") {
      onUpdate({
        type: nextType,
        answers: [
          { text: "True", correct: true },
          { text: "False", correct: false },
        ],
      });
      return;
    }

    if (nextType === "matching") {
      onUpdate({
        type: nextType,
        matches: question.matches?.length
          ? question.matches
          : Array.from({ length: 5 }, () => ({ left: "", right: "" })),
      });
      return;
    }

    onUpdate({
      type: nextType,
      acceptedAnswers: question.acceptedAnswers?.length ? question.acceptedAnswers : [""],
    });
  }

  return (
    <div className="pb-12">
      {/* HEADER ROW (dropdown top-right above the question) */}
      <div className="mb-3 flex items-center justify-end">
        <select
          value={question.type ?? "multiple_choice"}
          onChange={(e) => switchType(e.target.value as QuestionType)}
          className="
            rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold
            text-slate-700 shadow-sm outline-none
            focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
            dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-200
          "
        >
          <option value="multiple_choice">Multiple choice</option>
          <option value="true_false">True / False</option>
          <option value="matching">Matching</option>
          <option value="input">Input answer</option>
        </select>
      </div>

      {/* QUESTION (TOP) */}
      <div className="relative">
        {/* QUESTION TEXT */}
        <input
          value={question.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Type Question Here..."
          className="
            w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-base
            text-center font-semibold text-slate-900 shadow-sm outline-none
            focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
            dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-50
            placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500
            sm:text-lg
          "
        />

        {/* QUESTION IMAGE */}
        {question.image && (
          <div className="relative mx-auto mt-4 w-fit">
            <img
              src={question.image}
              alt="Question"
              className="
                max-h-72 rounded-2xl border border-slate-200/80 bg-white shadow-sm
                dark:border-slate-800/70 dark:bg-slate-950/40
              "
            />
            <button
              type="button"
              onClick={handleDeleteQuestionImage}
              className="
                absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-xl
                border border-slate-200/70 bg-white/80 text-slate-700 shadow-sm
                hover:bg-white transition-colors
                dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-950/80
                focus:outline-none focus:ring-2 focus:ring-red-400/40
              "
              aria-label="Delete question image"
              title="Delete image"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* IMAGE UPLOAD */}
        <div className="mt-4">
          <label
            className="
              inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl
              border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-semibold
              text-slate-700 shadow-sm hover:bg-white transition-colors
              dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:bg-slate-950/70
            "
          >
            <ImagePlus className="h-4 w-4" />
            {question.image ? "Change Question Image" : "Add Question Image (optional)"}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleQuestionImage(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {/* TYPE-SPECIFIC EDITOR */}
      <div className="mx-auto mt-6 w-full max-w-5xl">
        {question.type === "true_false" ? (
          <TrueFalseEditor question={question} onUpdate={onUpdate} />
        ) : question.type === "matching" ? (
          <MatchingEditor question={question} onUpdate={onUpdate} />
        ) : question.type === "input" ? (
          <InputAnswerEditor question={question} onUpdate={onUpdate} />
        ) : (
          <MultipleChoiceEditor question={question} onUpdate={onUpdate} />
        )}
      </div>

      {/* TIMER */}
      <div className="mx-auto mt-6 w-full max-w-2xl">
        <div
          className="
            rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-slate-200/80 bg-white/70 p-2 dark:border-slate-800/70 dark:bg-slate-950/40">
                <Timer className="h-4 w-4 text-slate-700 dark:text-[#A7F3FF]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Timer (seconds)
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Set a specific time for this question.
                </p>
              </div>
            </div>

            <input
              type="number"
              min={5}
              max={600}
              step={1}
              value={question.time ?? gameDefaultTime}
              onChange={(e) => {
                const raw = Number(e.target.value);

                // clamp to 5..600 (and handle NaN)
                const clamped = Number.isFinite(raw)
                  ? Math.max(5, Math.min(600, raw))
                  : Math.max(5, Math.min(600, gameDefaultTime));

                onUpdate({
                  timeMode: "specific",
                  time: clamped,
                });
              }}
              onBlur={(e) => {
                // ensure empty / invalid becomes a valid value when leaving the field
                const raw = Number(e.target.value);
                const clamped = Number.isFinite(raw)
                  ? Math.max(5, Math.min(600, raw))
                  : Math.max(5, Math.min(600, gameDefaultTime));

                if (String(clamped) !== e.target.value) {
                  onUpdate({ timeMode: "specific", time: clamped });
                }
              }}
              className="
                w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                shadow-sm outline-none
                focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                sm:w-32
              "
            />

          </div>
        </div>
      </div>
    </div>
  );
}
