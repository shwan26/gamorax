// src/lib/importQuestionsFromExcel.ts
import readXlsxFile from "read-excel-file";
import type { Question } from "@/src/lib/questionStorage";

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

  // Accept A/B/C/D
  const letter = c.toUpperCase();
  const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  if (map[letter] !== undefined) return map[letter];

  // Or accept exact answer text match (case-insensitive)
  const idx = answers.findIndex(
    (a) => a.trim().toLowerCase() === c.toLowerCase()
  );
  return idx;
}

export async function importQuestionsFromXlsx(
  file: File,
  defaultTime: number
): Promise<Question[]> {
  const rows = await readXlsxFile(file); // reads first sheet by default

  if (!rows || rows.length < 2) return [];

  const headers = rows[0];

  const qCol = findColIndex(headers, ["question"]);
  const aCol = findColIndex(headers, ["answera", "answera", "a"]);
  const bCol = findColIndex(headers, ["answerb", "b"]);
  const cCol = findColIndex(headers, ["answerc", "c"]);
  const dCol = findColIndex(headers, ["answerd", "d"]);
  const correctCol = findColIndex(headers, ["correctanswer", "correct", "correctanswer"]);

  // Basic header check (you can relax this if you want)
  if (qCol < 0 || aCol < 0 || bCol < 0 || cCol < 0 || dCol < 0 || correctCol < 0) {
    throw new Error(
      "Missing required columns. Need: Question, Answer A, Answer B, Answer C, Answer D, Correct Answer"
    );
  }

  const out: Question[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    const text = String(r[qCol] ?? "").trim();
    if (!text) continue; // skip empty rows

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
