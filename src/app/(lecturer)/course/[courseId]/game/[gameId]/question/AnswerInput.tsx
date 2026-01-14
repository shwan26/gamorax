"use client";

import { Answer } from "@/src/lib/questionStorage";

const colors = ["bg-red-500", "bg-blue-600", "bg-green-500", "bg-yellow-400"];
const labels = ["A", "B", "C", "D"];

export default function AnswerInput({
  answer,
  index,
  onChange,
  onCorrect,
}: {
  answer: Answer;
  index: number;
  onChange: (patch: Partial<Answer>) => void;
  onCorrect: () => void;
}) {
  function handleAnswerImage(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ image: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-start gap-3">
      {/* Label */}
      <div
        className={`w-10 h-10 rounded-md text-white flex items-center justify-center font-bold ${colors[index]}`}
      >
        {labels[index]}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <input
          value={answer.text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full border p-2 rounded-md"
          placeholder={`Answer ${labels[index]}`}
        />

        {/* Optional Answer Image */}
        {answer.image && (
          <img src={answer.image} className="max-h-24 rounded-md" />
        )}

        <label className="text-xs cursor-pointer hover:underline inline-block">
          + Add image (optional)
          <input
            type="file"
            hidden
            onChange={(e) => handleAnswerImage(e.target.files?.[0])}
          />
        </label>
      </div>

      {/* Correct checkbox */}
      <input
        type="checkbox"
        checked={answer.correct}
        onChange={onCorrect}
        className="mt-2"
        title="Mark correct"
      />
    </div>
  );
}
