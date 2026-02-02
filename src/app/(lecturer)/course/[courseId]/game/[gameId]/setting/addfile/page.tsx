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

    setFileName(file.name);
    setLoading(true);
    setNotice(null);

    try {
      // ✅ uses defaultTime from game.timer, fallback 60
      const { questions, breakdown } = await importQuestionsFromExcel(file, defaultTime);

      if (questions.length === 0) {
        alert(
          "No valid questions imported.\n\nExpected sheets (any subset):\n- MultipleChoice\n- TrueFalse\n- Matching\n- AnswerInput"
        );
        return;
      }

      const existing = await getQuestions(gameId);
      await saveQuestions(gameId, [...existing, ...questions]);

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
            "mt-4 block cursor-pointer rounded-3xl border border-slate-200/80 bg-white/55 p-6 text-center shadow-sm backdrop-blur transition",
            "hover:bg-white hover:shadow-md",
            "dark:border-slate-800/70 dark:bg-slate-950/40 dark:hover:bg-slate-950/55",
            loading ? "opacity-80 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <input type="file" accept=".xlsx" hidden onChange={handleFileUpload} disabled={loading} />

          <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
              <UploadCloud className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
            </div>

            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {loading ? "Importing..." : "Upload Excel (.xlsx)"}
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
        </label>
      </div>
    </div>
  );
}
