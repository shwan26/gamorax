// src/lib/importQuestionsFromExcel.ts
import readXlsxFile from "read-excel-file";
import type { Question } from "@/src/lib/questionStorage";

/* =======================
   helpers
======================= */

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

function isBlankRow(row: any[]) {
  return row.every((cell) => String(cell ?? "").trim() === "");
}

function parseCsvList(v: any) {
  return String(v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isTrue(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return ["true", "t", "yes", "y", "1"].includes(s);
}

function correctMaskFromValue(correctRaw: any, answers: string[]) {
  const parts = parseCsvList(correctRaw);
  const mask = new Array(answers.length).fill(false);

  if (parts.length === 0) return mask;

  const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

  for (const p of parts) {
    const up = p.toUpperCase();

    // letter mapping
    if (letterMap[up] !== undefined) {
      const idx = letterMap[up];
      if (idx >= 0 && idx < mask.length) mask[idx] = true;
      continue;
    }

    // exact text mapping
    const idx = answers.findIndex((a) => a.trim().toLowerCase() === p.toLowerCase());
    if (idx >= 0) mask[idx] = true;
  }

  return mask;
}

async function getWorkbookSheetNames(file: File): Promise<string[]> {
  const res = await readXlsxFile(file, ({ getSheets: true } as any));
  if (!Array.isArray(res)) return [];
  return res
    .map((s: any) => String(s?.name ?? "").trim())
    .filter(Boolean);
}



async function safeReadSheet(file: File, sheet: string) {
  try {
    return await readXlsxFile(file, { sheet });
  } catch {
    return null;
  }
}

function pickSheetName(all: string[], want: string[]) {
  const map = new Map<string, string>();
  for (const s of all) map.set(norm(s), s);

  for (const w of want) {
    const found = map.get(norm(w));
    if (found) return found;
  }
  return null;
}

/* =======================
   parsers
======================= */

function rowsToMultipleChoice(rows: any[][], defaultTime: number): Question[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];

  const qCol = findColIndex(headers, ["question", "q"]);
  const colA = findColIndex(headers, ["answera", "answer a", "a"]);
  const colB = findColIndex(headers, ["answerb", "answer b", "b"]);
  const colC = findColIndex(headers, ["answerc", "answer c", "c"]);
  const colD = findColIndex(headers, ["answerd", "answer d", "d"]);
  const colE = findColIndex(headers, ["answere", "answer e", "e"]);
  const correctCol = findColIndex(headers, ["correctanswer", "correct answer", "correct"]);

  if (qCol < 0 || correctCol < 0 || colA < 0 || colB < 0) {
    throw new Error(
      "MultipleChoice sheet missing columns.\nRequired: Question, Answer A, Answer B, Correct Answer.\nOptional: Answer C, Answer D, Answer E."
    );
  }

  const aCols = [colA, colB, colC, colD, colE].filter((x) => x >= 0);

  const out: Question[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || isBlankRow(r)) continue;

    const text = String(r[qCol] ?? "").trim();
    if (!text) continue;

    const raw = aCols.map((idx) => String(r[idx] ?? "").trim());

    // trim trailing blanks
    let lastNonEmpty = -1;
    for (let k = 0; k < raw.length; k++) if (raw[k]) lastNonEmpty = k;
    const sliced = lastNonEmpty >= 0 ? raw.slice(0, lastNonEmpty + 1) : [];

    // must have at least 2 answers
    if (sliced.filter(Boolean).length < 2) continue;

    // avoid gaps: A,B,"",D
    const hasGap = sliced.some((v, idx) => !v && sliced.slice(idx + 1).some(Boolean));
    if (hasGap) continue;

    const mask = correctMaskFromValue(r[correctCol], sliced);

    out.push({
      id: crypto.randomUUID(),
      type: "multiple_choice",
      text,
      image: undefined,
      answers: sliced.map((t, idx) => ({
        text: t,
        correct: !!mask[idx],
        image: undefined,
      })),
      matches: undefined,
      acceptedAnswers: undefined,
      timeMode: "specific",
      time: defaultTime,
    });
  }

  return out;
}

function rowsToTrueFalse(rows: any[][], defaultTime: number): Question[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];

  const qCol = findColIndex(headers, ["question", "q"]);
  const ansCol = findColIndex(headers, ["answer", "ans"]);

  if (qCol < 0 || ansCol < 0) {
    throw new Error("TrueFalse sheet missing columns. Required: Question, Answer");
  }

  const out: Question[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || isBlankRow(r)) continue;

    const text = String(r[qCol] ?? "").trim();
    if (!text) continue;

    const correctTrue = isTrue(r[ansCol]);

    out.push({
      id: crypto.randomUUID(),
      type: "true_false",
      text,
      image: undefined,
      answers: [
        { text: "True", correct: correctTrue, image: undefined },
        { text: "False", correct: !correctTrue, image: undefined },
      ],
      matches: undefined,
      acceptedAnswers: undefined,
      timeMode: "specific",
      time: defaultTime,
    });
  }

  return out;
}

function rowsToAnswerInput(rows: any[][], defaultTime: number): Question[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];

  const qCol = findColIndex(headers, ["question", "q"]);
  const ansCol = findColIndex(headers, ["answer", "ans"]);

  if (qCol < 0 || ansCol < 0) {
    throw new Error("AnswerInput sheet missing columns. Required: Question, Answer");
  }

  const out: Question[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || isBlankRow(r)) continue;

    const text = String(r[qCol] ?? "").trim();
    if (!text) continue;

    const accepted = parseCsvList(r[ansCol]);
    if (accepted.length === 0) continue;

    out.push({
      id: crypto.randomUUID(),
      type: "input",
      text,
      image: undefined,
      answers: [],
      matches: undefined,
      acceptedAnswers: accepted,
      timeMode: "specific",
      time: defaultTime,
    });
  }

  return out;
}

function rowsToMatching(rows: any[][], defaultTime: number): Question[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];

  const leftCol = findColIndex(headers, ["wordl", "word l", "left", "leftword"]);
  const rightCol = findColIndex(headers, ["wordr", "word r", "right", "rightword"]);

  if (leftCol < 0 || rightCol < 0) {
    throw new Error("Matching sheet missing columns. Required: Word L, Word R");
  }

  const out: Question[] = [];
  let buffer: { left: string; right: string }[] = [];

  function flush() {
    const cleaned = buffer
      .map((p) => ({ left: p.left.trim(), right: p.right.trim() }))
      .filter((p) => p.left || p.right);

    if (cleaned.length === 0) {
      buffer = [];
      return;
    }

    const pairs = cleaned.slice(0, 5);
    const idx = out.length + 1;

    out.push({
      id: crypto.randomUUID(),
      type: "matching",
      text: `Matching #${idx}`,
      image: undefined,
      answers: [],
      matches: pairs,
      acceptedAnswers: undefined,
      timeMode: "specific",
      time: defaultTime,
    });

    buffer = [];
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    if (isBlankRow(r)) {
      flush();
      continue;
    }

    const L = String(r[leftCol] ?? "").trim();
    const R = String(r[rightCol] ?? "").trim();
    if (!L && !R) continue;

    buffer.push({ left: L, right: R });
    if (buffer.length === 5) flush();
  }

  flush();
  return out;
}

/* =======================
   public API
======================= */

export type ImportBreakdown = {
  multipleChoice: number;
  trueFalse: number;
  matching: number;
  answerInput: number;
};

export async function importQuestionsFromExcel(
  file: File,
  defaultTime: number
): Promise<{ questions: Question[]; breakdown: ImportBreakdown }> {
  const sheetNames = await getWorkbookSheetNames(file);

  // allow sheet name variations
  const sheetMC = pickSheetName(sheetNames, ["MultipleChoice", "Multiple Choice", "MC"]);
  const sheetTF = pickSheetName(sheetNames, ["TrueFalse", "True False", "TF"]);
  const sheetM = pickSheetName(sheetNames, ["Matching", "Match"]);
  const sheetAI = pickSheetName(sheetNames, ["AnswerInput", "Answer Input", "Input"]);

  const mcRows = sheetMC ? await safeReadSheet(file, sheetMC) : null;
  const tfRows = sheetTF ? await safeReadSheet(file, sheetTF) : null;
  const mRows = sheetM ? await safeReadSheet(file, sheetM) : null;
  const aiRows = sheetAI ? await safeReadSheet(file, sheetAI) : null;

  const importedMC = mcRows ? rowsToMultipleChoice(mcRows, defaultTime) : [];
  const importedTF = tfRows ? rowsToTrueFalse(tfRows, defaultTime) : [];
  const importedM = mRows ? rowsToMatching(mRows, defaultTime) : [];
  const importedAI = aiRows ? rowsToAnswerInput(aiRows, defaultTime) : [];

  return {
    questions: [...importedMC, ...importedTF, ...importedM, ...importedAI],
    breakdown: {
      multipleChoice: importedMC.length,
      trueFalse: importedTF.length,
      matching: importedM.length,
      answerInput: importedAI.length,
    },
  };
}
