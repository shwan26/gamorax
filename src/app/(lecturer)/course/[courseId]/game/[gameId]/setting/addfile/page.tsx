"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import readXlsxFile from "read-excel-file";

import { getGameById } from "@/src/lib/gameStorage";
import { Question, getQuestions, saveQuestions } from "@/src/lib/questionStorage";

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

  const idx = answers.findIndex(
    (a) => a.trim().toLowerCase() === c.toLowerCase()
  );
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

export default function AddFileSetting() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ done notification
  const [notice, setNotice] = useState<string | null>(null);

  // ✅ show last imported file
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

      // ✅ ADD mode (append)
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
    <>
      <h3 className="font-semibold mb-4">Add File</h3>

      <p className="text-sm text-gray-600 mb-6">
        Upload an Excel file to create quiz questions in bulk.
      </p>

      {/* ✅ Success notification */}
      {notice && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      {/* ✅ Last imported info */}
      {lastMeta && (
        <div className="mb-4 rounded-md border bg-gray-50 px-4 py-3 text-sm">
          <div className="font-medium">Last imported file</div>
          <div className="text-gray-700">
            {lastMeta.fileName} • {lastMeta.importedCount} questions
          </div>
        </div>
      )}

      {/* Upload Box (single button) */}
      <label className="block border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-blue-50 transition">
        <input
          type="file"
          accept=".xlsx"
          hidden
          onChange={handleFileUpload}
          disabled={loading}
        />

        <p className="font-medium text-blue-700">
          {loading ? "Importing..." : "+ Upload Excel File"}
        </p>
        <p className="text-xs text-gray-500 mt-1">Supported formats: .xlsx</p>
      </label>

      {fileName && (
        <p className="text-sm text-green-600 mt-3">Selected: {fileName}</p>
      )}

      {/* Template Preview */}
      <div className="mt-8">
        <p className="font-medium mb-2">Excel Template Format</p>

        <img
          src="/excel-template-preview.png"
          alt="Excel template example"
          className="border rounded-md shadow-sm max-w-full"
        />

        <p className="text-xs text-gray-500 mt-2">
          Columns must include: Question, Answer A–D, Correct Answer
        </p>
      </div>
    </>
  );
}
