"use client";

import { Question } from "@/src/lib/questionStorage";
import AnswerInput from "./AnswerInput";

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
    // Setting to null makes it explicit that we're deleting it.
    // Your storage update should remove/clear the field accordingly.
    onUpdate({ image: null });
  }

  return (
    <div className="pb-12">
      {/* QUESTION TEXT */}
      <input
        value={question.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Type Question Here..."
        className="w-full border rounded-md p-3 text-center text-lg mb-4"
      />

      {/* QUESTION IMAGE + DELETE BUTTON */}
      {question.image && (
        <div className="relative mx-auto mb-4 w-fit">
          <img
            src={question.image}
            className="max-h-60 rounded-md"
            alt="Question"
          />

          <button
            type="button"
            onClick={handleDeleteQuestionImage}
            className="absolute top-2 right-2 rounded-full bg-black/70 text-white w-8 h-8 flex items-center justify-center hover:bg-black"
            aria-label="Delete question image"
            title="Delete image"
          >
            ✕
          </button>
        </div>
      )}

      <label className="block border rounded-md p-3 text-center text-gray-500 cursor-pointer mb-6">
        {question.image ? "Change Question Image" : "+ Add Question Image (optional)"}
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => handleQuestionImage(e.target.files?.[0])}
        />
      </label>

      {/* ANSWERS */}
      <div className="grid grid-cols-2 gap-6">
        {question.answers.map((ans, i) => (
          <AnswerInput
            key={i}
            index={i}
            answer={ans}
            onChange={(ansPatch) => {
              const next = [...question.answers];
              next[i] = { ...next[i], ...ansPatch };
              onUpdate({ answers: next });
            }}
            onCorrect={() => {
              onUpdate({
                answers: question.answers.map((a, idx) => ({
                  ...a,
                  correct: idx === i,
                })),
              });
            }}
          />
        ))}
      </div>

      {/* TIMER */}
      <div className="mt-6 text-sm flex items-center gap-3">
        <span className="font-medium">Timer (seconds):</span>

        <input
          type="number"
          min={1}
          value={question.time ?? gameDefaultTime}
          onChange={(e) => {
            const value = Number(e.target.value);
            onUpdate({
              timeMode: "specific",
              time: Number.isFinite(value) ? value : gameDefaultTime,
            });
          }}
          className="border rounded-md w-24 px-2 py-1"
        />
      </div>
    </div>
  );
}
