"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getQuestions, saveQuestions } from "@/src/lib/questionStorage";
import { importQuestionsFromExcel } from "@/src/lib/importQuestionsFromExcel";
import { UploadCloud, FileSpreadsheet, Info, CheckCircle2 } from "lucide-react";

type ImportMeta = {
  fileName: string;
  importedCount: number;
  importedAtIso: string;
  breakdown?: {
    multipleChoice: number;
    trueFalse: number;
    matching: number;
    answerInput: number;
  };
};

type TemplateSheet = {
  key: "MultipleChoice" | "TrueFalse" | "Matching" | "AnswerInput";
  title: string;
  cols: string[];
  rows: (string | number | boolean | null)[][];
  note?: string;
};

const TEMPLATE_SHEETS: TemplateSheet[] = [
  {
    key: "MultipleChoice",
    title: "MultipleChoice",
    cols: ["No.", "Question", "Answer A", "Answer B", "Answer C", "Answer D", "Correct Answer"],
    rows: [
      [1, "What is the biggest animal on the Land?", "Whale", "Rhino", "Bear", "Elephant", "Elephant"],
      [2, "What are fruits?", "Apple", "Banana", "White", "Socks", "Apple, Banana"],
    ],
    note: 'Correct Answer can be one or more values (comma-separated), e.g. "Apple, Banana".',
  },
  {
    key: "TrueFalse",
    title: "TrueFalse",
    cols: ["No.", "Question", "Answer"],
    rows: [[1, "Python is a programming language.", true]],
    note: "Answer should be TRUE or FALSE.",
  },
  {
    key: "Matching",
    title: "Matching",
    cols: ["Word L", "Word R"],
    rows: [
      ["Hot", "Cold"],
      ["Up", "Down"],
      ["Day", "Night"],
      ["Salt", "Pepper"],
    ],
    note: "Each row is one pair. Leave empty rows unused.",
  },
  {
    key: "AnswerInput",
    title: "AnswerInput",
    cols: ["No.", "Question", "Answer"],
    rows: [
      [1, "How many days in a year?", "365, 366"],
      [2, "What is the name of the planet we live on?", "Earth"],
    ],
    note: 'Answer can be multiple accepted answers (comma-separated), e.g. "365, 366".',
  },
];

function TemplateFormatCard() {
  const [active, setActive] = useState<TemplateSheet["key"]>("MultipleChoice");
  const sheet = TEMPLATE_SHEETS.find((s) => s.key === active)!;

  return (
    <div className="mt-5 rounded-3xl border border-slate-200/70 bg-white/55 p-4 shadow-sm backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Excel template format
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Use these sheet names and columns. You can include any subset of sheets.
          </p>
        </div>

        <a
          href="/templates/GamExample.xlsx"
          className="
            inline-flex items-center justify-center rounded-2xl
            border border-slate-200/70 bg-white/80 px-3 py-2
            text-xs font-semibold text-slate-700 shadow-sm transition
            hover:bg-white
            dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200 dark:hover:bg-slate-950/70
          "
        >
          Download template (.xlsx)
        </a>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TEMPLATE_SHEETS.map((s) => {
          const isOn = s.key === active;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                "border",
                isOn
                  ? "border-[#00D4FF]/40 bg-white text-slate-900 shadow-sm dark:bg-slate-950/60 dark:text-slate-50"
                  : "border-slate-200/70 bg-white/60 text-slate-600 hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:bg-slate-950/55",
              ].join(" ")}
            >
              {s.title}
            </button>
          );
        })}
      </div>

      {/* Table preview */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70">
        <div className="overflow-x-auto bg-white/70 dark:bg-slate-950/40">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/40">
              <tr>
                {sheet.cols.map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-200/60 dark:border-slate-800/60"
                >
                  {r.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-200">
                      {cell === null ? "" : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sheet.note && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold">Note:</span> {sheet.note}
        </p>
      )}
    </div>
  );
}


function metaKey(gameId: string) {
  return `gamorax_import_meta_${gameId}`;
}

function fmt(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function AddFileSetting() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<ImportMeta | null>(null);

  const params = useParams<{ gameId?: string }>();
  const gameId = (params?.gameId ?? "").toString();

  // ✅ async game fetch (Supabase)
  const [game, setGame] = useState<Game | null>(null);

  const [phase, setPhase] = useState<
      "idle" | "reading" | "parsing" | "saving" | "done"
    >("idle");
    const [fakePct, setFakePct] = useState(0);

    function phaseLabel(p: typeof phase) {
      switch (p) {
        case "reading":
          return "Reading file…";
        case "parsing":
          return "Parsing sheets…";
        case "saving":
          return "Saving questions…";
        case "done":
          return "Done!";
        default:
          return "";
      }
    }
  useEffect(() => {
    if (!loading) {
      setFakePct(0);
      setPhase("idle");
      return;
    }

    let alive = true;
    let pct = 0;

    // start in reading
    setPhase("reading");
    setFakePct(10);

    const t = setInterval(() => {
      if (!alive) return;

      // creep up to 92% while loading
      pct = Math.min(92, pct + Math.random() * 6 + 2);
      setFakePct(Math.floor(pct));
    }, 220);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [loading]);


  useEffect(() => {
    let alive = true;

    (async () => {
      if (!gameId) return;
      try {
        const g = await getGameById(gameId);
        if (alive) setGame(g);
      } catch {
        if (alive) setGame(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [gameId]);

  // ✅ defaultTime derived safely
  const defaultTime = game?.timer?.defaultTime ?? 60;

  useEffect(() => {
    if (!gameId) return;

    const raw = localStorage.getItem(metaKey(gameId));
    if (!raw) return;
    try {
      setLastMeta(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [gameId]);

  function saveMeta(meta: ImportMeta) {
    setLastMeta(meta);
    localStorage.setItem(metaKey(gameId), JSON.stringify(meta));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!gameId) {
      alert("Missing gameId");
      return;
    }

    if (!file.name.endsWith(".xlsx")) {
      alert("Please upload an Excel (.xlsx) file");
      return;
    }

    setLoading(true);
    setNotice(null);
    setPhase("reading");
    setFakePct(12);

    try {
      setPhase("parsing");

      const { questions, breakdown } = await importQuestionsFromExcel(file, defaultTime);

      if (questions.length === 0) {
        alert(
          "No valid questions imported.\n\nExpected sheets (any subset):\n- MultipleChoice\n- TrueFalse\n- Matching\n- AnswerInput"
        );
        return;
      }

      setPhase("saving");

      const existing = await getQuestions(gameId);
      await saveQuestions(gameId, [...existing, ...questions]);

      // finish progress
      setFakePct(100);
      setPhase("done");

      const meta: ImportMeta = {
        fileName: file.name,
        importedCount: questions.length,
        importedAtIso: new Date().toISOString(),
        breakdown,
      };
      saveMeta(meta);

      setNotice(
        `✅ Done! Added ${questions.length} questions. ` +
          `(MC: ${breakdown.multipleChoice}, TF: ${breakdown.trueFalse}, Matching: ${breakdown.matching}, Input: ${breakdown.answerInput})`
      );
      setTimeout(() => setNotice(null), 5000);
    } catch (err: any) {
      alert(err?.message ?? "Failed to import Excel file");
    } finally {
      setLoading(false);
      e.target.value = "";
    }

  }

  return (
    <div>
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#00D4FF]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
            <FileSpreadsheet className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Add File
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Upload an Excel file. It may contain any subset of these tabs:
              MultipleChoice, TrueFalse, Matching, AnswerInput.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Default question time: <span className="font-semibold">{defaultTime}s</span>
            </p>
          </div>
        </div>

        {notice && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm text-emerald-900 backdrop-blur dark:border-emerald-900/40 dark:bg-emerald-950/35 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">{notice}</div>
          </div>
        )}

        {lastMeta && (
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/55 p-4 text-sm text-slate-700 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  Last imported
                </div>
                <div className="mt-1 text-slate-700 dark:text-slate-200">
                  {lastMeta.fileName} • {lastMeta.importedCount} questions
                </div>
                {lastMeta.breakdown && (
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    MC: {lastMeta.breakdown.multipleChoice} • TF: {lastMeta.breakdown.trueFalse} •
                    Matching: {lastMeta.breakdown.matching} • Input: {lastMeta.breakdown.answerInput}
                  </div>
                )}
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {fmt(lastMeta.importedAtIso)}
                </div>
              </div>
            </div>
          </div>
        )}

        <label
          className={[
            "mt-4 block rounded-3xl border border-slate-200/80 bg-white/55 p-6 shadow-sm backdrop-blur transition",
            "hover:bg-white hover:shadow-md",
            "dark:border-slate-800/70 dark:bg-slate-950/40 dark:hover:bg-slate-950/55",
            loading ? "cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
        >
          <input
            type="file"
            accept=".xlsx"
            hidden
            onChange={handleFileUpload}
            disabled={loading}
          />

          <div className="relative mx-auto max-w-sm min-h-[170px]">
            {/* CONTENT */}
            <div className={loading ? "opacity-30 select-none" : ""}>
              <div className="mx-auto flex flex-col items-center gap-2 text-center">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
                  <UploadCloud className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {loading ? "Importing…" : "Upload Excel (.xlsx)"}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tabs can include: MultipleChoice / TrueFalse / Matching / AnswerInput
                </p>

                {fileName && (
                  <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                    Selected: <span className="font-semibold">{fileName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* LOADING OVERLAY */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="
                    w-full max-w-xs
                    rounded-3xl border border-slate-200/70 bg-white/85 p-4 shadow-sm backdrop-blur
                    dark:border-slate-800/70 dark:bg-slate-950/70
                  "
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent dark:border-slate-500 dark:border-t-transparent" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {phaseLabel(phase) || "Working…"}
                    </span>
                  </div>

                  {/* progress bar */}
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB] transition-all duration-300"
                        style={{ width: `${fakePct}%` }}
                      />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Please don’t close this tab</span>
                      <span className="tabular-nums">{fakePct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </label>
        <TemplateFormatCard />

      </div>
    </div>
  );
}
