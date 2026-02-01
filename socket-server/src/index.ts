import "./env.js"; // IMPORTANT: .js extension for NodeNext output
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as IOServer, Socket } from "socket.io";

import { supabaseAdmin } from "./supabaseAdmin.js";
import { calcPoints } from "./quizScoring.js";

/* -------------------- Types (server internal) -------------------- */

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

  // optional: link to DB question id (uuid) so we can update live_sessions.current_question_id
  questionId?: string | null;
};

type QuestionMC = LiveQuestionBase & {
  type: "multiple_choice" | "true_false";
  answers: string[];
  allowMultiple?: boolean;
  correctIndices?: number[]; // lecturer-only for scoring
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
  pairs: Map<number, number>;
  lastTimeUsed: number;
};

type AnswerRecord = AnswerChoice | AnswerInput | AnswerMatching;

type LiveStudent = {
  profileId: string;          // Supabase auth uid
  displayName: string;
  studentId?: string | null;  // from profiles.student_id (optional)
  avatarUrl?: string | null;
};

type PerQuestion = {
  questionIndex: number;
  number: number;
  type: LiveQuestionType;
  isCorrect: boolean;
  timeUsed: number;
  maxTime: number;
  pointsEarned: number;
};

type Score = {
  correct: number;
  totalTime: number;
  points: number;
  perQuestion: PerQuestion[];
};

type Room = {
  students: Map<string, LiveStudent>;                 // profileId -> student
  current?: QuestionPayloadOut;
  answers: Map<number, Map<string, AnswerRecord>>;    // qIndex -> (profileId -> record)
  scoredQuestions: Set<number>;
  scores: Map<string, Score>;                         // profileId -> totals
  durationByQuestion: Map<number, number>;

  // presence
  connections: Map<string, Set<string>>;              // profileId -> socketIds
};

type SessionRow = {
  id: string;
  quiz_id: string;
  lecturer_id: string;
  pin: string;
  is_active: boolean;
  status: "lobby" | "question" | "answer" | "final";
  question_index: number;
  total_questions: number;
  current_question_id: string | null;
  question_started_at: string | null;
  question_duration: number | null;
};

/* -------------------- In-memory rooms (realtime only) -------------------- */
/**
 * Supabase is the persistent store.
 * This map is ONLY for realtime:
 * - current question payload
 * - fast counting/scoring
 * - socket presence
 */
const rooms = new Map<string, Room>();

function getRoom(pin: string): Room {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      students: new Map(),
      answers: new Map(),
      scoredQuestions: new Set(),
      scores: new Map(),
      durationByQuestion: new Map(),
      connections: new Map()
    });
  }
  return rooms.get(pin)!;
}

/* -------------------- Helpers -------------------- */

function safeInt(n: any, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function normalizeText(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function sameSet(a: number[], b: number[]) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

function toPublicQuestion(q: any) {
  if (!q) return q;

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

function makeLeaderboard(room: Room) {
  return Array.from(room.students.values())
    .map((st) => {
      const sc =
        room.scores.get(st.profileId) ??
        ({ correct: 0, totalTime: 0, points: 0, perQuestion: [] } satisfies Score);

      return {
        studentId: st.studentId ?? st.profileId,
        name: st.displayName,
        avatarSrc: st.avatarUrl ?? undefined,
        ...sc
      };
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
    const uniq = Array.from(new Set(rec.indices ?? []));
    for (const idx of uniq) {
      if (idx >= 0 && idx < optionCount) counts[idx] = (counts[idx] ?? 0) + 1;
    }
  }

  return { counts, totalAnswers };
}

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

async function getActiveSessionByPin(pin: string): Promise<SessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("live_sessions")
    .select(
      "id,quiz_id,lecturer_id,pin,is_active,status,question_index,total_questions,current_question_id,question_started_at,question_duration"
    )
    .eq("pin", pin)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data as any) ?? null;
}

async function upsertParticipant(sessionId: string, student: LiveStudent) {
  // this matches your live_participants columns
  await supabaseAdmin
    .from("live_participants")
    .upsert(
      {
        session_id: sessionId,
        profile_id: student.profileId,
        display_name: student.displayName,
        student_id: student.studentId ?? null,
        avatar_url: student.avatarUrl ?? null
      },
      { onConflict: "session_id,profile_id" }
    );
}

async function insertMCAnswerIfPossible(opts: {
  sessionId: string;
  questionId: string | null;
  profileId: string;
  answerIndex: number;
  timeUsed: number;
}) {
  // Your table live_answers requires question_id NOT NULL
  if (!opts.questionId) return;

  // Your constraint is answer_index between 0..3 — clamp so insert won't fail
  const idx = Math.max(0, Math.min(3, opts.answerIndex));
  const timeUsed = Math.max(0, Math.floor(opts.timeUsed));

  await supabaseAdmin.from("live_answers").insert({
    session_id: opts.sessionId,
    question_id: opts.questionId,
    profile_id: opts.profileId,
    answer_index: idx,
    time_used: timeUsed
  });
}

async function upsertLiveScore(sessionId: string, profileId: string, score: Score) {
  await supabaseAdmin.from("live_scores").upsert(
    {
      session_id: sessionId,
      profile_id: profileId,
      correct: score.correct,
      points: score.points,
      total_time: score.totalTime,
      updated_at: new Date().toISOString()
    },
    { onConflict: "session_id,profile_id" }
  );
}

function emitRoomCount(io: IOServer, pin: string, room?: Room) {
  const r = room ?? rooms.get(pin) ?? getRoom(pin);
  const totalJoined = r.connections.size;
  io.to(pin).emit("room:count", { totalJoined });
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
  transports: ["websocket"]
});

/* -------------------- Auth middleware (NO GUEST) -------------------- */
/**
 * Client must connect like:
 * io(SOCKET_URL, { path:'/socket.io', auth:{ accessToken } })
 */
io.use(async (socket, next) => {
  try {
    const token = (socket.handshake.auth as any)?.accessToken;
    if (!token) return next(new Error("Missing accessToken"));

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return next(new Error("Invalid token"));

    const uid = data.user.id;

    // Load profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, student_id, avatar_seed, first_name, last_name")
      .eq("id", uid)
      .maybeSingle();

    if (!profile) return next(new Error("Profile not found"));

    socket.data.uid = uid;
    socket.data.role = profile.role; // 'student' | 'lecturer'

    // basic displayName
    const displayName =
      profile.role === "student"
        ? profile.full_name ?? "Student"
        : `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Lecturer";

    socket.data.displayName = displayName;
    socket.data.studentId = profile.student_id ?? null;
    socket.data.avatarUrl = profile.avatar_seed ? `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(profile.avatar_seed)}` : null;

    return next();
  } catch (e) {
    return next(new Error("Auth failed"));
  }
});

/* -------------------- Socket Logic -------------------- */

io.on("connection", (socket: Socket) => {
  const uid = socket.data.uid as string;
  const role = socket.data.role as "student" | "lecturer";
  const displayName = socket.data.displayName as string;
  const studentId = socket.data.studentId as string | null;
  const avatarUrl = socket.data.avatarUrl as string | null;

  // PIN check (ACK) — uses Supabase (truth)
  socket.on("pin:check", async ({ pin }: { pin: string }, ack?: (resp: any) => void) => {
    const p = String(pin ?? "").trim();
    if (!p) return ack?.({ exists: false });

    const session = await getActiveSessionByPin(p);
    if (!session) return ack?.({ exists: false });

    // "hasQuestion" if currently in question or answer and has a current_question_id or in-memory current
    const room = rooms.get(p);
    const hasQuestion = Boolean(room?.current) || Boolean(session.current_question_id);

    // presence count (socket presence, not DB)
    const totalJoined = room?.connections?.size ?? 0;

    return ack?.({
      exists: true,
      sessionId: session.id,
      quizId: session.quiz_id,
      status: session.status,
      questionIndex: session.question_index,
      totalQuestions: session.total_questions,
      hasQuestion,
      totalJoined
    });
  });

  // STUDENT JOIN
  socket.on("join", async ({ pin }: { pin: string }) => {
    const p = String(pin ?? "").trim();
    if (!p) return;

    const session = await getActiveSessionByPin(p);
    if (!session) {
      socket.emit("join:error", { message: "PIN not active" });
      return;
    }

    // join socket room
    socket.join(p);
    socket.data.pin = p;

    // track presence in memory
    const room = getRoom(p);

    const st: LiveStudent = {
      profileId: uid,
      displayName,
      studentId,
      avatarUrl
    };

    room.students.set(uid, st);
    room.scores.set(uid, room.scores.get(uid) ?? { correct: 0, totalTime: 0, points: 0, perQuestion: [] });

    const set = room.connections.get(uid) ?? new Set<string>();
    set.add(socket.id);
    room.connections.set(uid, set);

    // persist participant
    await upsertParticipant(session.id, st);

    emitRoomCount(io, p, room);
    io.to(p).emit("students:update", Array.from(room.students.values()).map((x) => ({
      studentId: x.studentId ?? x.profileId,
      name: x.displayName,
      avatarSrc: x.avatarUrl ?? undefined
    })));

    // if a question is live in memory, send it
    if (room.current) {
      socket.emit("question:show", toPublicQuestion(room.current));
      const { counts, totalAnswers } = countsForRoom(room, room.current.questionIndex);
      socket.emit("answer:count", { questionIndex: room.current.questionIndex, counts, totalAnswers });
      socket.emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
    }
  });

  // LECTURER JOIN
  socket.on("lecturer:join", async ({ pin }: { pin: string }) => {
    const p = String(pin ?? "").trim();
    if (!p) return;

    const session = await getActiveSessionByPin(p);
    if (!session) {
      socket.emit("join:error", { message: "PIN not active" });
      return;
    }

    // Only allow lecturer who owns session
    if (role !== "lecturer" || session.lecturer_id !== uid) {
      socket.emit("join:error", { message: "Not allowed" });
      return;
    }

    socket.join(p);
    socket.data.pin = p;

    const room = getRoom(p);

    emitRoomCount(io, p, room);

    socket.emit("students:update", Array.from(room.students.values()).map((x) => ({
      studentId: x.studentId ?? x.profileId,
      name: x.displayName,
      avatarSrc: x.avatarUrl ?? undefined
    })));

    if (room.current) {
      socket.emit("question:show", toPublicQuestion(room.current));
      const { counts, totalAnswers } = countsForRoom(room, room.current.questionIndex);
      socket.emit("answer:count", { questionIndex: room.current.questionIndex, counts, totalAnswers });
      socket.emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });
    }
  });

  // QUESTION SHOW (lecturer)
  socket.on("question:show", async ({ pin, question }: { pin: string; question: any }) => {
    const p = String(pin ?? "").trim();
    if (!p || !question) return;

    const session = await getActiveSessionByPin(p);
    if (!session) return;

    if (role !== "lecturer" || session.lecturer_id !== uid) return;

    const room = getRoom(p);

    const qIndex = safeInt(question.questionIndex, 0);
    const dur = safeInt(question.durationSec, 20);

    const base: LiveQuestionBase = {
      questionIndex: qIndex,
      number: safeInt(question.number, qIndex + 1),
      total: safeInt(question.total, session.total_questions ?? 1),
      text: String(question.text ?? ""),
      type: (question.type ?? "multiple_choice") as LiveQuestionType,
      image: question.image ?? null,
      startAt: safeInt(question.startAt, Date.now()),
      durationSec: dur,
      questionId: question.questionId ? String(question.questionId) : null
    };

    let out: QuestionPayloadOut;

    if (base.type === "matching") {
      out = {
        ...base,
        type: "matching",
        left: Array.isArray(question.left) ? question.left.map((x: any) => String(x ?? "")) : [],
        right: Array.isArray(question.right) ? question.right.map((x: any) => String(x ?? "")) : [],
        correctPairs: Array.isArray(question.correctPairs) ? question.correctPairs : []
      };
    } else if (base.type === "input") {
      out = {
        ...base,
        type: "input",
        acceptedAnswers: Array.isArray(question.acceptedAnswers)
          ? question.acceptedAnswers.map((x: any) => String(x ?? "")).filter(Boolean)
          : []
      };
    } else {
      out = {
        ...base,
        type: base.type,
        answers: Array.isArray(question.answers) ? question.answers.map((x: any) => String(x ?? "")) : [],
        allowMultiple: Boolean(question.allowMultiple),
        correctIndices: Array.isArray(question.correctIndices)
          ? question.correctIndices.map(Number).filter(Number.isFinite)
          : []
      };
    }

    room.current = out;
    room.answers.set(qIndex, new Map());
    room.scoredQuestions.delete(qIndex);
    room.durationByQuestion.set(qIndex, dur);

    // persist live_sessions state
    await supabaseAdmin
      .from("live_sessions")
      .update({
        status: "question",
        question_index: qIndex,
        current_question_id: base.questionId ?? null,
        question_started_at: new Date(base.startAt).toISOString(),
        question_duration: dur
      })
      .eq("id", session.id);

    io.to(p).emit("question:show", toPublicQuestion(room.current));

    const initCounts =
      out.type === "true_false"
        ? [0, 0]
        : out.type === "multiple_choice"
          ? Array.from({ length: Math.min(5, out.answers.length) }, () => 0)
          : [];

    io.to(p).emit("answer:count", { questionIndex: qIndex, counts: initCounts, totalAnswers: 0 });
  });

  // ANSWER (MC/TF)
  socket.on("answer", async (payload: any) => {
    const p = String(payload?.pin ?? "").trim();
    if (!p) return;

    const room = rooms.get(p);
    if (!room) return;

    const qIndex = safeInt(payload?.questionIndex, -1);
    if (qIndex < 0) return;

    const map = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();
    if (map.has(uid)) return;

    let indices: number[] = [];
    if (Array.isArray(payload?.indices)) {
      indices = payload.indices.map(Number).filter(Number.isFinite);
    } else if (Number.isFinite(payload?.answerIndex)) {
      indices = [Number(payload.answerIndex)];
    }

    const timeUsed = safeInt(payload?.timeUsed, 0);

    map.set(uid, { kind: "choice", indices, timeUsed });
    room.answers.set(qIndex, map);

    io.to(p).emit("answer:count", { questionIndex: qIndex, ...countsForRoom(room, qIndex) });

    // Persist to Supabase (best-effort): only first index, only if we have session + questionId
    try {
      const session = await getActiveSessionByPin(p);
      if (session) {
        const questionId = room.current?.questionId ?? session.current_question_id;
        const first = indices[0] ?? 0;
        await insertMCAnswerIfPossible({
          sessionId: session.id,
          questionId,
          profileId: uid,
          answerIndex: first,
          timeUsed
        });
      }
    } catch {
      // ignore persistence errors; realtime still works
    }
  });

  // INPUT ANSWER
  socket.on("answer:input", async (payload: any) => {
    const p = String(payload?.pin ?? "").trim();
    if (!p) return;

    const room = rooms.get(p);
    if (!room) return;

    const qIndex = safeInt(payload?.questionIndex, -1);
    if (qIndex < 0) return;

    const map = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();
    if (map.has(uid)) return;

    const value = String(payload?.value ?? "");
    const timeUsed = safeInt(payload?.timeUsed, 0);

    map.set(uid, { kind: "input", value, timeUsed });
    room.answers.set(qIndex, map);

    io.to(p).emit("answer:count", { questionIndex: qIndex, counts: [], totalAnswers: map.size });

    // Optional: persist input answers later by adding a jsonb table.
  });

  // MATCH ATTEMPT (ack returns {correct})
  socket.on("match:attempt", (payload: any, cb?: (resp: any) => void) => {
    const p = String(payload?.pin ?? "").trim();
    if (!p) return cb?.({ correct: false });

    const room = rooms.get(p);
    if (!room) return cb?.({ correct: false });

    const qIndex = safeInt(payload?.questionIndex, -1);
    if (qIndex < 0) return cb?.({ correct: false });

    if (!room.current || room.current.questionIndex !== qIndex || room.current.type !== "matching") {
      return cb?.({ correct: false });
    }

    const correctMap = buildCorrectMatchIndexMap(room);
    const L = safeInt(payload?.leftIndex, -1);
    const R = safeInt(payload?.rightIndex, -1);
    const isCorrect = correctMap.get(L) === R;

    const map = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();
    let rec = map.get(uid);

    if (!rec || rec.kind !== "matching") {
      rec = { kind: "matching", pairs: new Map(), lastTimeUsed: 0 } as AnswerMatching;
      map.set(uid, rec);
      room.answers.set(qIndex, map);

      io.to(p).emit("answer:count", { questionIndex: qIndex, counts: [], totalAnswers: map.size });
    }

    const mr = rec as AnswerMatching;

    for (const [l, r] of mr.pairs.entries()) {
      if (l === L || r === R) return cb?.({ correct: false });
    }

    if (isCorrect) {
      mr.pairs.set(L, R);
      mr.lastTimeUsed = safeInt(payload?.timeUsed, mr.lastTimeUsed);
      map.set(uid, mr);
      room.answers.set(qIndex, map);
      return cb?.({ correct: true });
    }

    return cb?.({ correct: false });
  });

  // REVEAL + SCORE (lecturer)
  socket.on("reveal", async (payload: any) => {
    const p = String(payload?.pin ?? "").trim();
    if (!p) return;

    const session = await getActiveSessionByPin(p);
    if (!session) return;

    if (role !== "lecturer" || session.lecturer_id !== uid) return;

    const room = rooms.get(p);
    if (!room?.current) return;

    const qIndex = safeInt(payload?.questionIndex, room.current?.questionIndex ?? 0);
    if (room.current.questionIndex !== qIndex) return;
    if (room.scoredQuestions.has(qIndex)) return;

    const maxTime = room.durationByQuestion.get(qIndex) ?? safeInt(room.current.durationSec, 20);

    // attach lecturer-only keys for scoring + reveal payload
    const type = payload?.type as LiveQuestionType;

    if (type === "matching" && room.current.type === "matching") {
      room.current.correctPairs = Array.isArray(payload?.correctPairs) ? payload.correctPairs : [];
      io.to(p).emit("answer:reveal", {
        questionIndex: qIndex,
        type: "matching",
        correctPairs: room.current.correctPairs,
        maxTime
      });
    } else if (type === "input" && room.current.type === "input") {
      room.current.acceptedAnswers = Array.isArray(payload?.acceptedAnswers) ? payload.acceptedAnswers : [];
      io.to(p).emit("answer:reveal", {
        questionIndex: qIndex,
        type: "input",
        acceptedAnswers: room.current.acceptedAnswers,
        maxTime
      });
    } else {
      if (room.current.type !== "multiple_choice" && room.current.type !== "true_false") return;

      room.current.correctIndices = Array.isArray(payload?.correctIndices) ? payload.correctIndices : [];
      io.to(p).emit("answer:reveal", {
        questionIndex: qIndex,
        type: room.current.type,
        correctIndices: room.current.correctIndices,
        maxTime
      });
    }

    room.scoredQuestions.add(qIndex);

    const ansMap = room.answers.get(qIndex) ?? new Map<string, AnswerRecord>();

    // score everyone who answered
    for (const [profileId, rec] of ansMap.entries()) {
      const prevScore =
        room.scores.get(profileId) ?? ({ correct: 0, totalTime: 0, points: 0, perQuestion: [] } satisfies Score);

      if (prevScore.perQuestion.some((pq) => pq.questionIndex === qIndex)) continue;

      let isCorrect = false;
      let timeUsed = 0;

      if (room.current.type === "multiple_choice" || room.current.type === "true_false") {
        const correctIndices = Array.isArray(room.current.correctIndices) ? room.current.correctIndices : [];
        const allowMultiple = Boolean(room.current.allowMultiple) || correctIndices.length > 1;

        if (rec.kind === "choice") {
          if (allowMultiple) {
            const mine = Array.isArray(rec.indices) ? rec.indices : [];
            isCorrect = mine.some((i) => correctIndices.includes(i));
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
        pointsEarned
      };

      const nextScore: Score = {
        correct: prevScore.correct + (isCorrect ? 1 : 0),
        totalTime: prevScore.totalTime + timeUsed,
        points: prevScore.points + pointsEarned,
        perQuestion: [...prevScore.perQuestion, detail]
      };

      room.scores.set(profileId, nextScore);

      io.to(p).emit("score:update", { studentId: profileId, total: nextScore, last: detail });

      // persist totals (best effort)
      try {
        await upsertLiveScore(session.id, profileId, nextScore);
      } catch {}
    }

    io.to(p).emit("leaderboard:update", { leaderboard: makeLeaderboard(room) });

    // session status -> answer (persist)
    await supabaseAdmin.from("live_sessions").update({ status: "answer" }).eq("id", session.id);
  });

  // FINISH (lecturer)
  socket.on("finish", async ({ pin, payload }: { pin: string; payload: any }) => {
    const p = String(pin ?? "").trim();
    if (!p) return;

    const session = await getActiveSessionByPin(p);
    if (!session) return;

    if (role !== "lecturer" || session.lecturer_id !== uid) return;

    const room = rooms.get(p) ?? getRoom(p);

    io.to(p).emit("final_results", {
      pin: p,
      total: payload?.total ?? room.current?.total ?? session.total_questions,
      leaderboard: makeLeaderboard(room)
    });

    io.to(p).emit("quiz:finished", payload);

    await supabaseAdmin
      .from("live_sessions")
      .update({ status: "final", is_active: false, ended_at: new Date().toISOString() })
      .eq("id", session.id);
  });

  // LEAVE
  socket.on("leave", async ({ pin }: { pin: string }) => {
    const p = String(pin ?? "").trim();
    if (!p) return;

    const room = rooms.get(p);
    if (!room) return;

    const set = room.connections.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) room.connections.delete(uid);
    }

    if (!room.connections.has(uid)) {
      room.students.delete(uid);
      // keep scores so reconnect doesn't lose progress
    }

    socket.leave(p);
    emitRoomCount(io, p, room);

    io.to(p).emit("students:update", Array.from(room.students.values()).map((x) => ({
      studentId: x.studentId ?? x.profileId,
      name: x.displayName,
      avatarSrc: x.avatarUrl ?? undefined
    })));
  });

  // DISCONNECTING
  socket.on("disconnecting", () => {
    const pin = socket.data?.pin as string | undefined;
    if (!pin) return;

    const room = rooms.get(pin);
    if (!room) return;

    const set = room.connections.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        room.connections.delete(uid);
        room.students.delete(uid);
        io.to(pin).emit("students:update", Array.from(room.students.values()).map((x) => ({
          studentId: x.studentId ?? x.profileId,
          name: x.displayName,
          avatarSrc: x.avatarUrl ?? undefined
        })));
        emitRoomCount(io, pin, room);
      } else {
        room.connections.set(uid, set);
      }
    }
  });
});

/* -------------------- Boot -------------------- */

const PORT = Number(process.env.PORT || 4000);
httpServer.listen(PORT, () => console.log(`✅ Socket server running on ${PORT}`));
