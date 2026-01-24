"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import readXlsxFile from "read-excel-file";
import { getGameById } from "@/src/lib/gameStorage";
import { Question, getQuestions, saveQuestions } from "@/src/lib/questionStorage";
import { UploadCloud, FileSpreadsheet, Info, CheckCircle2 } from "lucide-react";

function norm(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findColIndex(headers: any[], candidates: string[]) {
  const h = headers.map(norm);
  for (const c of candidates.map(norm)) {
    const idx = h.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

function correctIndexFromValue(correctRaw: string, answers: string[]) {
  const c = String(correctRaw ?? "").trim();
  if (!c) return -1;

  const letter = c.toUpperCase();
  const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  if (map[letter] !== undefined) return map[letter];

  const idx = answers.findIndex((a) => a.trim().toLowerCase() === c.toLowerCase());
  return idx;
}

function rowsToQuestions(rows: any[][], defaultTime: number): Question[] {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];

  const qCol = findColIndex(headers, ["question"]);
  const aCol = findColIndex(headers, ["answera", "answer a", "a"]);
  const bCol = findColIndex(headers, ["answerb", "answer b", "b"]);
  const cCol = findColIndex(headers, ["answerc", "answer c", "c"]);
  const dCol = findColIndex(headers, ["answerd", "answer d", "d"]);
  const correctCol = findColIndex(headers, ["correctanswer", "correct answer", "correct"]);

  if ([qCol, aCol, bCol, cCol, dCol, correctCol].some((x) => x < 0)) {
    throw new Error(
      "Missing columns. Required: Question, Answer A, Answer B, Answer C, Answer D, Correct Answer"
    );
  }

  const out: Question[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    const text = String(r[qCol] ?? "").trim();
    if (!text) continue;

    const answersText = [
      String(r[aCol] ?? "").trim(),
      String(r[bCol] ?? "").trim(),
      String(r[cCol] ?? "").trim(),
      String(r[dCol] ?? "").trim(),
    ];

    const ci = correctIndexFromValue(String(r[correctCol] ?? ""), answersText);

    out.push({
      id: crypto.randomUUID(),
      text,
      image: undefined,
      answers: answersText.map((t, idx) => ({
        text: t,
        correct: idx === ci,
        image: undefined,
      })),
      timeMode: "specific",
      time: defaultTime,
    });
  }

  return out;
}

type ImportMeta = {
  fileName: string;
  importedCount: number;
  importedAtIso: string;
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

  const game = useMemo(() => (gameId ? getGameById(gameId) : null), [gameId]);
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

    if (!file.name.endsWith(".xlsx")) {
      alert("Please upload an Excel (.xlsx) file");
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setNotice(null);

    try {
      const rows = await readXlsxFile(file);
      const imported = rowsToQuestions(rows, defaultTime);

      if (imported.length === 0) {
        alert("No valid rows found in the Excel file.");
        return;
      }

      // ADD mode (append)
      const existing = getQuestions(gameId);
      saveQuestions(gameId, [...existing, ...imported]);

      const meta: ImportMeta = {
        fileName: file.name,
        importedCount: imported.length,
        importedAtIso: new Date().toISOString(),
      };
      saveMeta(meta);

      setNotice(`✅ Done! Added ${imported.length} questions.`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      alert(err?.message ?? "Failed to import Excel file");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      {/* soft glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#00D4FF]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

      <div className="relative">
        {/* header */}
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
            <FileSpreadsheet className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Add File
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Upload an Excel file to create quiz questions in bulk.
            </p>
          </div>
        </div>

        {/* notice */}
        {notice && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm text-emerald-900 backdrop-blur dark:border-emerald-900/40 dark:bg-emerald-950/35 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">{notice}</div>
          </div>
        )}

        {/* last import */}
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
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {fmt(lastMeta.importedAtIso)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* uploader */}
        <label
          className={[
            "mt-4 block cursor-pointer rounded-3xl border border-slate-200/80 bg-white/55 p-6 text-center shadow-sm backdrop-blur transition",
            "hover:bg-white hover:shadow-md",
            "dark:border-slate-800/70 dark:bg-slate-950/40 dark:hover:bg-slate-950/55",
            loading ? "opacity-80 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <input
            type="file"
            accept=".xlsx"
            hidden
            onChange={handleFileUpload}
            disabled={loading}
          />

          <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/55">
              <UploadCloud className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
            </div>

            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {loading ? "Importing..." : "Upload Excel (.xlsx)"}
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Columns: Question, Answer A–D, Correct Answer
            </p>

            {fileName && (
              <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                Selected: <span className="font-semibold">{fileName}</span>
              </p>
            )}
          </div>
        </label>

        {/* template */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Excel Template Format
            </p>
            <span className="rounded-full border border-slate-200/80 bg-white/70 px-2 py-1 text-xs text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/55 dark:text-slate-200">
              Preview
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/60 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/45">
            <img
              src="/excel-template-preview.png"
              alt="Excel template example"
              className="block w-full"
            />
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Make sure the header names match (case/spacing doesn’t matter).
          </p>
        </div>
      </div>
    </div>
  );
}
