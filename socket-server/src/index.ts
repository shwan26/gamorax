import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { calcPoints } from "./quizScoring.js";

/* -------------------- Types -------------------- */

type LiveStudent = { studentId: string; name: string; avatarSrc?: string };
type LiveQuestionType = "multiple_choice" | "true_false" | "matching" | "input";

type LiveQuestionBase = {
  questionIndex: number;
  number: number;
  total: number;
  text: string;
  type: LiveQuestionType;
  image?: string | null;
  startAt: number;
  durationSec: number;
};

type QuestionMC = LiveQuestionBase & {
  type: "multiple_choice" | "true_false";
  answers: string[];
  allowMultiple?: boolean;
  correctIndices?: number[]; // lecturer-only (server uses)
};

type QuestionMatching = LiveQuestionBase & {
  type: "matching";
  left: string[];
  right: string[];
  correctPairs?: { left: string; right: string }[]; // lecturer-only
};

type QuestionInput = LiveQuestionBase & {
  type: "input";
  acceptedAnswers?: string[]; // lecturer-only
};

type QuestionPayloadOut = QuestionMC | QuestionMatching | QuestionInput;

type AnswerChoice = { kind: "choice"; indices: number[]; timeUsed: number };
type AnswerInput = { kind: "input"; value: string; timeUsed: number };
type AnswerMatching = {
  kind: "matching";
  pairs: Map<number, number>; // leftIndex -> rightIndex
  lastTimeUsed: number; // seconds at last correct match
};

type AnswerRecord = AnswerChoice | AnswerInput | AnswerMatching;

type PerQuestion = {
  questionIndex: number;
  number: number;          // 1-based
  type: LiveQuestionType;
  isCorrect: boolean;
  timeUsed: number;        // seconds used for scoring
  maxTime: number;         // seconds
  pointsEarned: number;
};

type Score = {
  correct: number;
  totalTime: number;
  points: number;
  perQuestion: PerQuestion[];
};

type RoomMeta = {
  gameId?: string;
  quizTitle?: string;
  courseCode?: string;
  courseName?: string;
  section?: string;
  semester?: string;
};

type Room = {
  meta?: RoomMeta;
  students: Map<string, LiveStudent>;
  current?: QuestionPayloadOut;
  answers: Map<number, Map<string, AnswerRecord>>;
  scoredQuestions: Set<number>;
  scores: Map<string, Score>;
  durationByQuestion: Map<number, number>;
};

/* -------------------- Helpers -------------------- */

const rooms = new Map<string, Room>();

function topublicQuestion(q: any) {
  if (!q) return q;

  // remove lecturer-only keys
  if (q.type === "multiple_choice" || q.type === "true_false") {
    const { correctIndices, ...rest } = q;
    return rest;
  }
  if (q.type === "matching") {
    const { correctPairs, ...rest } = q;
    return rest;
  }
  if (q.type === "input") {
    const { acceptedAnswers, ...rest } = q;
    return rest;
  }
  return q;
}

function getRoom(pin: string): Room {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      students: new Map(),
      answers: new Map(),
      scoredQuestions: new Set(),
      scores: new Map(),
      durationByQuestion: new Map(),
    });
  }
  return rooms.get(pin)!;
}

function safeInt(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function cleanMeta(meta: any): RoomMeta {
  const clean = (v: any) => {
    const s = String(v ?? "").trim();
    return s || undefined;
  };

  const out: RoomMeta = {};
  const gameId = clean(meta?.gameId); if (gameId) out.gameId = gameId;
  const quizTitle = clean(meta?.quizTitle); if (quizTitle) out.quizTitle = quizTitle;
  const courseCode = clean(meta?.courseCode); if (courseCode) out.courseCode = courseCode;
  const courseName = clean(meta?.courseName); if (courseName) out.courseName = courseName;
  const section = clean(meta?.section); if (section) out.section = section;
  const semester = clean(meta?.semester); if (semester) out.semester = semester;

  return out;
}


function sameSet(a: number[], b: number[]) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

function normalizeText(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function makeLeaderboard(room: Room) {
  return Array.from(room.students.values())
    .map((st) => {
      const sc = room.scores.get(st.studentId) ?? { correct: 0, totalTime: 0, points: 0, perQuestion: [] };
      return { ...st, ...sc };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.correct - a.correct ||
        a.totalTime - b.totalTime ||
        String(a.studentId).localeCompare(String(b.studentId))
    )
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

// counts only meaningful for MC/TF (first selected index)
function countsForRoom(room: Room, qIndex: number) {
  const map = room.answers.get(qIndex);
  const totalAnswers = map ? map.size : 0;

  const q = room.current;
  const optionCount =
    q && (q.type === "multiple_choice" || q.type === "true_false")
      ? q.type === "true_false"
        ? 2
        : Math.min(5, Array.isArray((q as any).answers) ? (q as any).answers.length : 0)
      : 0;

  const counts = Array.from({ length: optionCount }, () => 0);

  if (!map || optionCount === 0) return { counts, totalAnswers };

  for (const rec of map.values()) {
    if (rec.kind !== "choice") continue;

    // ✅ multi-select distribution: count each selected index once
    const uniq = Array.from(new Set(rec.indices ?? []));
    for (const idx of uniq) {
        if (idx >= 0 && idx < optionCount) {
          counts[idx] = (counts[idx] ?? 0) + 1;
        }
    }
  }

  return { counts, totalAnswers };
}


// for matching: build correct index map from strings
function buildCorrectMatchIndexMap(room: Room): Map<number, number> {
  const q = room.current;
  const out = new Map<number, number>();
  if (!q || q.type !== "matching") return out;

  const left = Array.isArray(q.left) ? q.left : [];
  const right = Array.isArray(q.right) ? q.right : [];
  const pairs = Array.isArray(q.correctPairs) ? q.correctPairs : [];

  for (const p of pairs) {
    const l = left.indexOf(String(p.left ?? ""));
    const r = right.indexOf(String(p.right ?? ""));
    if (l >= 0 && r >= 0) out.set(l, r);
  }
  return out;
}

/* -------------------- Server -------------------- */

const app = express();

const origin = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? false;

app.use(cors({ origin, credentials: true }));
app.get("/health", (_, res) => res.send("ok"));

const httpServer = createServer(app);

const io = new IOServer(httpServer, {
  path: "/socket.io",
  cors: { origin, credentials: true },
  transports: ["websocket"],
});

function emitRoomCount(pin: string, room: Room) {
  io.to(pin).emit("room:count", { totalJoined: room.students.size });
}

/* -------------------- Socket Logic -------------------- */

io.on("connection", (socket: Socket) => {
  // JOIN
  socket.on("join", ({ pin, student }) => {
    if (!pin) return;
    socket.join(pin);

    const room = getRoom(pin);

    if (room.meta) socket.emit("session:meta", room.meta);
    if (student?.studentId) {
      room.students.set(student.studentId, student);
      room.scores.set(
        student.studentId,
        room.scores.get(student.studentId) ?? { correct: 0, totalTime: 0, points: 0, perQuestion: [] }
      );

      emitRoomCount(pin, room);
      io.to(pin).emit("students:update", [...room.students.values()]);
    }

    const cur = room.current;

    if (cur) {
      socket.emit("question:show", topublicQuestion(cur));

      const { counts, totalAnswers } = countsForRoom(room, cur.questionIndex);

      socket.emit("answer:count", {
        questionIndex: cur.questionIndex,
        counts,
        totalAnswers,
      });

      socket.emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
    }

  });

  // META
  socket.on("meta:set", ({ pin, meta }) => {
    if (!pin || !meta) return;
    const room = getRoom(pin);
    room.meta = { ...(room.meta ?? {}), ...cleanMeta(meta) };
    io.to(pin).emit("session:meta", room.meta);
  });

  // QUESTION
  socket.on("question:show", ({ pin, question }: { pin: string; question: any }) => {
    if (!pin || !question) return;
    const room = getRoom(pin);

    const qIndex = safeInt(question.questionIndex, 0);
    const dur = safeInt(question.durationSec, 20);

    const base: LiveQuestionBase = {
      questionIndex: qIndex,
      number: safeInt(question.number, qIndex + 1),
      total: safeInt(question.total, 1),
      text: String(question.text ?? ""),
      type: (question.type ?? "multiple_choice") as LiveQuestionType,
      image: question.image ?? null,
      startAt: safeInt(question.startAt, Date.now()),
      durationSec: dur,
    };

    let out: QuestionPayloadOut;

    if (base.type === "matching") {
      out = {
        ...base,
        type: "matching",
        left: Array.isArray(question.left) ? question.left.map((x: any) => String(x ?? "")) : [],
        right: Array.isArray(question.right) ? question.right.map((x: any) => String(x ?? "")) : [],
        correctPairs: Array.isArray(question.correctPairs) ? question.correctPairs : [],
      };
    } else if (base.type === "input") {
      out = {
        ...base,
        type: "input",
        acceptedAnswers: Array.isArray(question.acceptedAnswers)
          ? question.acceptedAnswers.map((x: any) => String(x ?? "")).filter(Boolean)
          : [],
      };
    } else {
      out = {
        ...base,
        type: base.type,
        answers: Array.isArray(question.answers) ? question.answers.map((x: any) => String(x ?? "")) : [],
        allowMultiple: Boolean(question.allowMultiple),
        correctIndices: Array.isArray(question.correctIndices) ? question.correctIndices.map(Number).filter(Number.isFinite) : [],
      };
    }

    room.current = out;
    room.answers.set(qIndex, new Map());
    room.scoredQuestions.delete(qIndex);
    room.durationByQuestion.set(qIndex, dur);

    io.to(pin).emit("question:show", topublicQuestion(room.current));
    const initCounts =
      out.type === "true_false"
        ? [0, 0]
        : out.type === "multiple_choice"
        ? Array.from({ length: Math.min(5, out.answers.length) }, () => 0)
        : [];

    io.to(pin).emit("answer:count", {
      questionIndex: qIndex,
      counts: initCounts,
      totalAnswers: 0,
    });
  });

  // ANSWER (MC/TF) - supports new {indices[]} and old {answerIndex}
  socket.on("answer", (payload: any) => {
    const { pin, studentId, questionIndex } = payload ?? {};
    if (!pin || !studentId) return;

    const room = getRoom(pin);
    const qIndex = safeInt(questionIndex, -1);
    if (qIndex < 0) return;

    const map = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();
    if (map.has(studentId)) return; // one final submission per student

    let indices: number[] = [];
    if (Array.isArray(payload?.indices)) {
      indices = payload.indices.map(Number).filter(Number.isFinite);
    } else if (Number.isFinite(payload?.answerIndex)) {
      indices = [Number(payload.answerIndex)];
    }

    const timeUsed = safeInt(payload?.timeUsed, 0);

    map.set(studentId, { kind: "choice", indices, timeUsed });
    room.answers.set(qIndex, map);

    io.to(pin).emit("answer:count", {
      questionIndex: qIndex,
      ...countsForRoom(room, qIndex),
    });

  });

  // INPUT ANSWER
  socket.on("answer:input", (payload: any) => {
    const { pin, studentId, questionIndex } = payload ?? {};
    if (!pin || !studentId) return;

    const room = getRoom(pin);
    const qIndex = safeInt(questionIndex, -1);
    if (qIndex < 0) return;

    const map = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();
    if (map.has(studentId)) return;

    const value = String(payload?.value ?? "");
    const timeUsed = safeInt(payload?.timeUsed, 0);

    map.set(studentId, { kind: "input", value, timeUsed });
    room.answers.set(qIndex, map);

    io.to(pin).emit("answer:count", {
      questionIndex: qIndex,
      counts: [],         // input has no bars
      totalAnswers: map.size,
    });

  });

  // MATCH ATTEMPT (ack returns {correct})
  socket.on("match:attempt", (payload: any, cb?: (resp: any) => void) => {
  const { pin, studentId, questionIndex, leftIndex, rightIndex } = payload ?? {};
  if (!pin || !studentId) return cb?.({ correct: false });

  const room = getRoom(pin);
  const qIndex = safeInt(questionIndex, -1);
  if (qIndex < 0) return cb?.({ correct: false });

  if (!room.current || room.current.questionIndex !== qIndex || room.current.type !== "matching") {
    return cb?.({ correct: false });
  }

  const correctMap = buildCorrectMatchIndexMap(room);
  const L = safeInt(leftIndex, -1);
  const R = safeInt(rightIndex, -1);
  const isCorrect = correctMap.get(L) === R;

  const map = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();
  let rec = map.get(studentId);

  // ✅ count as "answered" once they attempt matching (first attempt)
  if (!rec || rec.kind !== "matching") {
    rec = { kind: "matching", pairs: new Map(), lastTimeUsed: 0 } as AnswerMatching;
    map.set(studentId, rec);
    room.answers.set(qIndex, map);

    io.to(pin).emit("answer:count", {
      questionIndex: qIndex,
      counts: [],              // matching has no bars
      totalAnswers: map.size,  // ✅ answeredCount
    });
  }

  const mr = rec as AnswerMatching;

  // do not allow reusing left/right once used
  for (const [l, r] of mr.pairs.entries()) {
    if (l === L || r === R) return cb?.({ correct: false });
  }

  if (isCorrect) {
    mr.pairs.set(L, R);
    mr.lastTimeUsed = safeInt(payload?.timeUsed, mr.lastTimeUsed);
    map.set(studentId, mr);
    room.answers.set(qIndex, map);
    cb?.({ correct: true });
    return;
  }

  cb?.({ correct: false });
});


  // REVEAL + SCORE
  socket.on("reveal", (payload: any) => {
    const { pin, questionIndex, type } = payload ?? {};
    if (!pin) return;

    const room = getRoom(pin);
    const qIndex = safeInt(questionIndex, room.current?.questionIndex ?? 0);

    if (!room.current || room.current.questionIndex !== qIndex) return;
    if (room.scoredQuestions.has(qIndex)) return;

    const maxTime = room.durationByQuestion.get(qIndex) ?? safeInt(room.current.durationSec, 20);

    // attach lecturer-only keys to current for scoring
    if (type === "matching" && room.current.type === "matching") {
      room.current.correctPairs = Array.isArray(payload?.correctPairs) ? payload.correctPairs : [];
      io.to(pin).emit("answer:reveal", { questionIndex: qIndex, type: "matching", correctPairs: room.current.correctPairs, maxTime });
    } else if (type === "input" && room.current.type === "input") {
      room.current.acceptedAnswers = Array.isArray(payload?.acceptedAnswers) ? payload.acceptedAnswers : [];
      io.to(pin).emit("answer:reveal", { questionIndex: qIndex, type: "input", acceptedAnswers: room.current.acceptedAnswers, maxTime });
    } else {
      // MC/TF
      if (room.current.type !== "multiple_choice" && room.current.type !== "true_false") return;

      room.current.correctIndices = Array.isArray(payload?.correctIndices) ? payload.correctIndices : [];
      io.to(pin).emit("answer:reveal", {
        questionIndex: qIndex,
        type: room.current.type,
        correctIndices: room.current.correctIndices,
        maxTime,
      });

      
    }

    // score once
    room.scoredQuestions.add(qIndex);

    const ansMap = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();

    for (const [sid, rec] of ansMap.entries()) {
      const prevScore: Score =
        room.scores.get(sid) ?? { correct: 0, totalTime: 0, points: 0, perQuestion: [] };

      if (prevScore.perQuestion.some((pq) => pq.questionIndex === qIndex)) continue;

      let isCorrect = false;
      let timeUsed = 0;

      if (room.current.type === "multiple_choice" || room.current.type === "true_false") {
        const correctIndices = Array.isArray(room.current.correctIndices) ? room.current.correctIndices : [];
        const allowMultiple = Boolean(room.current.allowMultiple) || correctIndices.length > 1;

        if (rec.kind === "choice") {
          if (allowMultiple) {
            const mine = Array.isArray(rec.indices) ? rec.indices : [];
            isCorrect = mine.some((i) => correctIndices.includes(i)); // ANY overlap
          } else {
            isCorrect = sameSet(rec.indices ?? [], correctIndices ?? []);
          }
          timeUsed = safeInt(rec.timeUsed, maxTime);
        } else {
          isCorrect = false;
          timeUsed = maxTime;
        }
      } else if (room.current.type === "input") {
        const accepted = Array.isArray(room.current.acceptedAnswers) ? room.current.acceptedAnswers : [];

        if (rec.kind === "input") {
          const v = normalizeText(rec.value);
          isCorrect = accepted.map(normalizeText).includes(v);
          timeUsed = safeInt(rec.timeUsed, maxTime);
        } else {
          isCorrect = false;
          timeUsed = maxTime;
        }
      } else if (room.current.type === "matching") {
        const correctMap = buildCorrectMatchIndexMap(room);

        if (rec.kind === "matching") {
          const okSize = rec.pairs.size === correctMap.size && correctMap.size > 0;
          let ok = okSize;

          if (ok) {
            for (const [l, r] of correctMap.entries()) {
              if (rec.pairs.get(l) !== r) {
                ok = false;
                break;
              }
            }
          }

          isCorrect = ok;
          timeUsed = safeInt(rec.lastTimeUsed, maxTime);
        } else {
          isCorrect = false;
          timeUsed = maxTime;
        }
      }

  const pointsEarned = calcPoints({ isCorrect, maxTime, timeUsed });

  const detail: PerQuestion = {
    questionIndex: qIndex,
    number: room.current.number,
    type: room.current.type,
    isCorrect,
    timeUsed,
    maxTime,
    pointsEarned,
  };

  const nextScore: Score = {
    correct: prevScore.correct + (isCorrect ? 1 : 0),
    totalTime: prevScore.totalTime + timeUsed,
    points: prevScore.points + pointsEarned,
    perQuestion: [...prevScore.perQuestion, detail],
  };

  room.scores.set(sid, nextScore);

  // ✅ per-student update (student filters by their id)
  io.to(pin).emit("score:update", { studentId: sid, total: nextScore, last: detail });
}


    io.to(pin).emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
  });

  // FINISH (unchanged)
  socket.on("finish", ({ pin, payload }: { pin: string; payload: any }) => {
    if (!pin || !payload) return;
    const room = getRoom(pin);
    io.to(pin).emit("final_results", { pin, total: payload.total, leaderboard: makeLeaderboard(room) });
    io.to(pin).emit("quiz:finished", payload);
  });

  socket.on("leave", ({ pin, studentId }) => {
    if (!pin || !studentId) return;
    const room = getRoom(pin);
    room.students.delete(studentId);
    room.scores.delete(studentId);
    for (const m of room.answers.values()) m.delete(studentId);
    socket.leave(pin);
    emitRoomCount(pin, room);
    io.to(pin).emit("students:update", [...room.students.values()]);
  });
});

/* -------------------- Boot -------------------- */

const PORT = Number(process.env.PORT || 4000);
httpServer.listen(PORT, () => console.log(`✅ Socket server running on ${PORT}`));
