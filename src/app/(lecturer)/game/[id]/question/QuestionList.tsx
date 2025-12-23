"use client";

import { Question } from "@/src/lib/questionStorage";

export default function QuestionList({
  questions,
  activeIndex,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  dragIndex,
  setDragIndex,
  onDrop,
}: {
  questions: Question[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;

  dragIndex: number | null;
  setDragIndex: (i: number | null) => void;
  onDrop: (targetIndex: number) => void;
}) {
  return (
    <div className="w-32 px-6 overflow-y-auto">
      <div className="flex flex-col gap-4">
        {questions.map((_, i) => (
          <div
            key={questions[i].id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onClick={() => onSelect(i)}
            className={`relative rounded-md py-6 font-bold cursor-pointer text-center ${
              i === activeIndex ? "bg-[#6AB6E9]" : "bg-[#A5D4F3]"
            } ${dragIndex === i ? "opacity-70" : ""}`}
            title="Drag to reorder"
          >
            {i + 1}

            {/* DELETE */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(i);
              }}
              className="absolute top-1 right-1 text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              title="Delete"
            >
              ✕
            </button>

            {/* DUPLICATE */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(i);
              }}
              className="absolute bottom-1 right-1 text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              title="Duplicate"
            >
              ⧉
            </button>
          </div>
        ))}

        <button
          onClick={onAdd}
          className="bg-[#A5D4F3] rounded-md py-6 text-xl"
          title="Add new question"
        >
          +
        </button>
      </div>
    </div>
  );
}
