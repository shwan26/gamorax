"use client";

import type { Question } from "@/src/lib/questionStorage";
import { Plus, Trash2, Copy, GripVertical } from "lucide-react";

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
    <div className="h-full w-full px-2 py-3 overflow-y-auto">
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => {
          const active = i === activeIndex;
          const dragging = dragIndex === i;
          const type = q.type ?? "multiple_choice";
          const hasQuestion = !!q.text?.trim();

          // ---- completeness by type ----
          const mcAnswers = (q.answers ?? []).map((a) => String(a?.text ?? "").trim());
          const mcNonEmpty = mcAnswers.filter(Boolean);
          const mcHasCorrect = (q.answers ?? []).some((a) => !!a.correct);

          const tfHasCorrect = (q.answers ?? []).some((a) => !!a.correct); // should be 1

          const pairs = q.matches ?? [];
          const pairCompleteCount = pairs.filter(
            (p) => !!String(p?.left ?? "").trim() && !!String(p?.right ?? "").trim()
          ).length;
          const pairAnyStarted = pairs.some(
            (p) => !!String(p?.left ?? "").trim() || !!String(p?.right ?? "").trim()
          );
          const pairHasBroken = pairs.some((p) => {
            const L = !!String(p?.left ?? "").trim();
            const R = !!String(p?.right ?? "").trim();
            return (L && !R) || (!L && R);
          });

          const accepted = (q.acceptedAnswers ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);

          // ---- determine "started" ----
          const started =
            hasQuestion ||
            mcNonEmpty.length > 0 ||
            pairAnyStarted ||
            accepted.length > 0;

          // ---- determine "complete" ----
          let complete = false;

          if (type === "multiple_choice") {
            complete = hasQuestion && mcNonEmpty.length >= 2 && mcHasCorrect;
          } else if (type === "true_false") {
            complete = hasQuestion && tfHasCorrect;
          } else if (type === "matching") {
            // require at least 2 full pairs, no half-filled rows
            complete = hasQuestion && pairCompleteCount >= 2 && !pairHasBroken;
          } else if (type === "input") {
            complete = hasQuestion && accepted.length >= 1;
          }

          // ---- status ----
          const status: "new" | "complete" | "incomplete" =
            !started ? "new" : complete ? "complete" : "incomplete";

          const dotCls =
            status === "new"
              ? "bg-slate-300 dark:bg-slate-700"
              : status === "complete"
              ? "bg-emerald-500"
              : "bg-red-500";



          return (
            <div
              key={q.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              onClick={() => onSelect(i)}
              title="Drag to reorder"
              className={[
                "group relative cursor-pointer select-none",
                "rounded-2xl border transition-all",
                "h-16 w-full", // ✅ taller tiles
                "flex items-center justify-center",
                active
                  ? "border-[#00D4FF]/55 bg-white/85 shadow-sm dark:bg-slate-950/65"
                  : "border-slate-200/70 bg-white/70 hover:bg-white/90 dark:border-slate-800/70 dark:bg-slate-950/50 dark:hover:bg-slate-950/65",
                dragging ? "opacity-70" : "",
              ].join(" ")}
            >
              {/* number badge */}
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold",
                  active
                    ? "bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
                ].join(" ")}
              >
                {i + 1}
              </div>

              {/* drag hint (tiny) */}
              <GripVertical className="absolute left-1.5 top-1.5 h-4 w-4 text-slate-300 dark:text-slate-700" />

              {/* actions appear on hover */}
              <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(i);
                  }}
                  className="
                    inline-flex h-7 w-7 items-center justify-center rounded-full
                    border border-slate-200/80 bg-white/85 shadow-sm
                    hover:bg-white transition-colors
                    dark:border-slate-800/70 dark:bg-slate-950/70 dark:hover:bg-slate-950/85
                    focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/35
                  "
                  title="Duplicate"
                  aria-label="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(i);
                  }}
                  className="
                    inline-flex h-7 w-7 items-center justify-center rounded-full
                    border border-red-200/80 bg-white/85 shadow-sm
                    hover:bg-white transition-colors
                    dark:border-red-900/40 dark:bg-slate-950/70 dark:hover:bg-slate-950/85
                    focus:outline-none focus:ring-2 focus:ring-red-400/35
                  "
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </button>
              </div>

              {/* status dot */}
              <span
                className={[
                  "absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full",
                  "ring-2 ring-white/70 dark:ring-slate-950/60",
                  dotCls,
                ].join(" ")}
                title={
                  status === "new"
                    ? "New question"
                    : status === "complete"
                    ? "Complete"
                    : "Incomplete (missing answers or correct choice))"
                }
              />

            </div>
          );
        })}

        {/* add new tile */}
        <button
          type="button"
          onClick={onAdd}
          className="
            group mt-1 h-16 w-full
            rounded-2xl border border-slate-200/70 bg-white/70
            hover:bg-white/90 transition-colors
            dark:border-slate-800/70 dark:bg-slate-950/50 dark:hover:bg-slate-950/65
            focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
            flex items-center justify-center
          "
          title="Add new question"
          aria-label="Add new question"
        >
          <div
            className="
              flex h-10 w-10 items-center justify-center rounded-xl
              bg-slate-100 text-slate-700
              dark:bg-slate-900/60 dark:text-slate-200
              group-hover:scale-[1.03] transition-transform
            "
          >
            <Plus className="h-5 w-5" />
          </div>
        </button>
      </div>
    </div>
  );
}
