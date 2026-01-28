// src/app/(student)/join/[pin]/question/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import localFont from "next/font/local";

import Navbar from "@/src/components/Navbar";
import { socket } from "@/src/lib/socket";

import { getCurrentStudent, addPointsToStudent } from "@/src/lib/studentAuthStorage";
import { saveStudentAttempt } from "@/src/lib/studentReportStorage";

import type { LiveStudent } from "@/src/lib/liveStorage";
import type {
  LiveQuestionType,
  LiveQuestionPayloadMC,
  LiveQuestionPayloadMatching,
  LiveQuestionPayloadInput,
  LiveQuestionShowEvent,
  LiveRevealEvent,
} from "@/src/lib/liveStorage";

import { getLiveMeta, saveLiveMeta, getLiveMeta as _getLiveMeta } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent } from "@/src/lib/liveStudentSession";
import { getAvatarSrc } from "@/src/lib/studentAvatar";

import AnswerGrid from "@/src/components/live/AnswerGrid";
import { calcPoints } from "@/src/lib/quizScoring";
import { Trophy, CheckCircle2, XCircle, Timer, Sparkles } from "lucide-react";

export type QuestionType = LiveQuestionType;


const caesar = localFont({
  src: "../../../../../../public/fonts/CaesarDressing-Regular.ttf",
});

/* ------------------------------ UI helpers ------------------------------ */
function isInputPayload(q: LiveQuestionPayload): q is LiveQuestionPayloadInput {
  return "acceptedAnswers" in q;
}


function DotPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    />
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-3xl",
        "border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur",
        "dark:border-slate-800/70 dark:bg-slate-950/45",
        className,
      ].join(" ")}
    >
      <DotPattern />
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />
      <div className="relative">{children}</div>
    </section>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white",
        "bg-gradient-to-b from-[#034B6B] to-[#0B6FA6]",
        "shadow-[0_10px_25px_rgba(37,99,235,0.18)]",
        "hover:opacity-95 active:scale-[0.99] transition",
        "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ------------------------------ existing types ------------------------------ */
type LiveQuestionPayload =
  | LiveQuestionPayloadMC
  | LiveQuestionPayloadMatching
  | LiveQuestionPayloadInput;

function sameSet(a: number[], b: number[]) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size !== B.size) return false;
    for (const x of A) if (!B.has(x)) return false;
  return true;
}


type QuizFinishedPayload = {
  total: number;
  qa: any[];
};

export default function StudentQuestionPage() {
  const router = useRouter();
  const params = useParams<{ pin?: string }>();
  const pin = (params?.pin ?? "").toString().trim();

  const [mounted, setMounted] = useState(false);
  const [student, setStudent] = useState<LiveStudent | null>(null);

  const [phase, setPhase] = useState<"waiting" | "question" | "result" | "final">("waiting");
  type StudentLiveQuestion =
    | (LiveQuestionPayloadMC)
    | (LiveQuestionPayloadMatching)
    | (LiveQuestionPayloadInput);

  const [question, setQuestion] = useState<StudentLiveQuestion | null>(null);


  // stable refs
  const selectedIndexRef = useRef<number | null>(null);
  const answeredQIndexRef = useRef<number | null>(null);
  const currentQIndexRef = useRef<number>(0);
  const correctIndexRef = useRef<number | null>(null);
  const lastScoredQIndexRef = useRef<number>(-1);

  const myByQRef = useRef<Record<number, { indices: number[]; timeUsed: number }>>({});
  const correctByQRef = useRef<Record<number, number>>({});
  const maxTimeByQRef = useRef<Record<number, number>>({});

  // UI state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [scoredCount, setScoredCount] = useState(0);

  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0);

  const [finalPoints, setFinalPoints] = useState<number>(0);
  const [downloadPayload, setDownloadPayload] = useState<QuizFinishedPayload | null>(null);

  // timer
  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number>(20);
  const durationSecRef = useRef<number>(20);

  const [now, setNow] = useState<number>(0);
  const questionStartAtRef = useRef<number | null>(null);

  const s = socket;

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  // load student
  useEffect(() => {
    if (!mounted) return;
    if (!pin) return;

    const me = getCurrentStudent();
    if (!me) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }

    const st = getOrCreateLiveStudent();
    if (!st) {
      router.replace(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }

    setStudent(st);
  }, [mounted, pin, router]);

  const titleText = useMemo(() => (pin ? `Quiz Session — ${pin}` : "Quiz Session"), [pin]);
  const avatarSrc = useMemo(() => getAvatarSrc(student, 96), [student]);

  // timer tick
  useEffect(() => {
    if (phase !== "question") return;
    if (!startAt) return;

    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [phase, startAt]);

  // local time end => show result screen, score only on reveal
  useEffect(() => {
    if (phase !== "question") return;
    if (!startAt) return;

    const limit = durationSec * 1000;
    if (now - startAt >= limit) {
      setStartAt(null);
      questionStartAtRef.current = null;
      setPhase("result");
      setLastWasCorrect(null);
      setLastEarnedPoints(0);
    }
  }, [phase, startAt, now, durationSec]);

  // socket listeners
  useEffect(() => {
    if (!mounted) return;
    if (!pin || !student) return;

    s.connect();

    const doJoin = () => s.emit("join", { pin, student });
    if (s.connected) doJoin();
    s.on("connect", doJoin);

    const onMeta = (meta: any) => {
      saveLiveMeta(pin, meta);
    };
    s.on("session:meta", onMeta);

    const onQuestionShow = (payload: any) => {
      const qq = (payload?.question ?? payload) as LiveQuestionPayload;

      const number = Number(qq?.number ?? 1);
      const qIndex = typeof qq?.questionIndex === "number" ? qq.questionIndex : Math.max(0, number - 1);

      const total = Number(qq?.total ?? 1);
      const text = String(qq?.text ?? "");
      const type = qq.type; // ✅ already LiveQuestionType

      const sAt = typeof qq?.startAt === "number" ? qq.startAt : Date.now();
      const dur = Number.isFinite(Number(qq?.durationSec)) ? Math.max(1, Number(qq.durationSec)) : 20;

      currentQIndexRef.current = qIndex;
      maxTimeByQRef.current[qIndex] = dur;
      durationSecRef.current = dur;

      setStartAt(sAt);
      setDurationSec(dur);
      setNow(Date.now());
      questionStartAtRef.current = sAt;

      // ✅ Build question object based on type (narrow union)
      if (type === "multiple_choice" || type === "true_false") {
        setQuestion({
          questionIndex: qIndex,
          number,
          total,
          text,
          type,
          answers: Array.isArray(qq.answers) ? qq.answers : [],
          allowMultiple: Boolean(qq.allowMultiple),
        } as any);
      } else if (type === "matching") {
        setQuestion({
          questionIndex: qIndex,
          number,
          total,
          text,
          type,
          left: Array.isArray(qq.left) ? qq.left : [],
          right: Array.isArray(qq.right) ? qq.right : [],
        } as any);
      } else if (isInputPayload(qq)) {
        // input
        setQuestion({
          questionIndex: qIndex,
          number,
          total,
          text,
          type,
          acceptedAnswers: Array.isArray(qq.acceptedAnswers) ? qq.acceptedAnswers : [],
        } as any);
      } else {
        // fallback (if server sends unexpected shape)
        setQuestion({
          questionIndex: qIndex,
          number,
          total,
          text,
          type,
          acceptedAnswers: [],
        } as any);
      }


      setPhase("question");

      setSelectedIndex(null);
      selectedIndexRef.current = null;
      answeredQIndexRef.current = null;

      setLastWasCorrect(null);
      setLastEarnedPoints(0);
    };



    const onReveal = (p?: LiveRevealEvent | any) => {
      const rv = (p ?? {}) as Partial<LiveRevealEvent>;

      setPhase("result");
      setStartAt(null);
      questionStartAtRef.current = null;

      const qIdx =
        typeof rv.questionIndex === "number"
          ? rv.questionIndex
          : currentQIndexRef.current;

      if (typeof rv.maxTime === "number" && Number.isFinite(rv.maxTime)) {
        maxTimeByQRef.current[qIdx] = Math.max(1, Math.round(rv.maxTime));
      }

      setScoredCount((prev) => Math.max(prev, qIdx + 1));

      if (qIdx <= lastScoredQIndexRef.current) return;
      lastScoredQIndexRef.current = qIdx;

      const maxTime = maxTimeByQRef.current[qIdx] ?? durationSecRef.current ?? 0;
      const mine = myByQRef.current[qIdx];
      const myIndices = mine?.indices ?? [];

      // ✅ MC/TF
      if (rv.type === "multiple_choice" || rv.type === "true_false") {
        const correctIndices =
          Array.isArray((rv as any).correctIndices)
            ? (rv as any).correctIndices
            : Number.isFinite((rv as any).correctIndex)
            ? [(rv as any).correctIndex]
            : [];

        if (!correctIndices.length) {
          setLastWasCorrect(null);
          setLastEarnedPoints(0);
          return;
        }

        const isCorrect = myIndices.length ? sameSet(myIndices, correctIndices) : false;
        const timeUsed = mine?.timeUsed ?? maxTime;
        const earned = calcPoints({ isCorrect, maxTime, timeUsed });

        setLastWasCorrect(isCorrect);
        setLastEarnedPoints(earned);

        if (isCorrect) setCorrectCount((prev) => prev + 1);
        setTotalPoints((prev) => prev + earned);
        return;
      }

      // matching/input scoring later
      setLastWasCorrect(null);
      setLastEarnedPoints(0);
    };



    const onNext = () => {
      setPhase("waiting");

      setSelectedIndex(null);
      selectedIndexRef.current = null;
      answeredQIndexRef.current = null;

      setStartAt(null);
      questionStartAtRef.current = null;

      setLastWasCorrect(null);
      setLastEarnedPoints(0);
    };

    const onFinished = (data: any) => {
      const payload: QuizFinishedPayload | null =
        data?.payload && typeof data.payload === "object"
          ? data.payload
          : data && typeof data === "object" && Array.isArray(data.qa)
          ? data
          : null;

      setDownloadPayload(payload ?? null);
      setPhase("final");

      const total = Math.max(1, Number(payload?.total ?? scoredCount ?? 1));

      let computedCorrect = 0;
      let computedPoints = 0;

      [...Array(total)].forEach((_, qi) => {
        const mine = myByQRef.current[qi];
        const myIndices = mine?.indices ?? [];

        const correctIndex = correctByQRef.current[qi]; // still number for now
        const hasCorrect = typeof correctIndex === "number";

        const maxTime = maxTimeByQRef.current[qi] ?? 0;
        const timeUsed = mine?.timeUsed ?? maxTime;

        // compare first picked only (since server currently supports 1 correct index)
        const myFirst = typeof myIndices[0] === "number" ? myIndices[0] : -1;
        const isCorrect = hasCorrect && myFirst >= 0 && myFirst === correctIndex;

        const earned = calcPoints({ isCorrect, maxTime, timeUsed });

        if (isCorrect) computedCorrect += 1;
        computedPoints += earned;
      });

      setFinalPoints(computedPoints);

      const me = getCurrentStudent();
      if (!me) return;
      const meta = _getLiveMeta(pin);

      saveStudentAttempt({
        id: crypto.randomUUID(),
        studentEmail: me.email,
        studentId: me.studentId,
        studentName: me.name,
        avatarSrc: getAvatarSrc(student, 96),

        pin,
        gameId: meta?.gameId,

        courseCode: meta?.courseCode,
        courseName: meta?.courseName,
        section: meta?.section,
        semester: meta?.semester,
        quizTitle: meta?.quizTitle ?? "Quiz",

        totalQuestions: total,
        correct: computedCorrect,
        points: computedPoints,
        finishedAt: new Date().toISOString(),
        perQuestion: [],
      });

      addPointsToStudent(me.email, computedPoints);
    };

    s.on("question:show", onQuestionShow);
    s.on("answer:reveal", onReveal);
    s.on("question:next", onNext);
    s.on("quiz:finished", onFinished);

    return () => {
      s.off("connect", doJoin);
      s.off("session:meta", onMeta);
      s.off("question:show", onQuestionShow);
      s.off("answer:reveal", onReveal);
      s.off("question:next", onNext);
      s.off("quiz:finished", onFinished);
      s.off("quiz_finished", onFinished);
    };
  }, [mounted, pin, student]);

  const submitChoice = (indices: number[]) => {
    if (!student || !question) return;
    if (phase !== "question") return;

    // prevent double submit
    if (answeredQIndexRef.current === question.questionIndex) return;

    if (startAt) {
      const elapsed = Date.now() - startAt;
      if (elapsed >= durationSec * 1000) return;
    }

    // UI: highlight first picked only (fine)
    setSelectedIndex(indices[0] ?? null);
    selectedIndexRef.current = indices[0] ?? null;

    const qIndex = question.questionIndex;
    answeredQIndexRef.current = qIndex;

    const ms = questionStartAtRef.current ? Date.now() - questionStartAtRef.current : 0;
    const timeUsed = Math.max(0, Math.round(ms / 1000));

    // ✅ store array (important for multi-correct later)
    myByQRef.current[qIndex] = { indices, timeUsed };

    // ✅ send to server (MC/TF)
    s.emit("answer", {
      pin,
      studentId: student.studentId,
      questionIndex: qIndex,
      answerIndex: indices[0] ?? -1,   // ✅ server needs this
      indices,                         // (optional, future use)
      timeUsed,
    });

  };


  const hasPicked = selectedIndex !== null;
  const disableButtons = phase !== "question" || hasPicked;

  const elapsed = startAt ? Math.max(0, now - startAt) : 0;
  const limit = durationSec * 1000;
  const pctRemaining = startAt && limit > 0 ? Math.max(0, 100 - (elapsed / limit) * 100) : 0;
  const remainingSec = startAt ? Math.max(0, Math.ceil((limit - elapsed) / 1000)) : 0;

  const finalDenom = (downloadPayload?.total ?? scoredCount) || 1;

  if (!mounted) return null;
  if (!pin) return <div className="p-6">Missing PIN.</div>;
  if (!student) return null;

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:pt-8">
        {/* TOP header */}
        <GlassCard className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {titleText}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`${caesar.className} text-2xl tracking-wide text-slate-900 dark:text-slate-50`}
                >
                  GAMORAX
                </span>
                <span
                  className="
                    rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-semibold
                    text-slate-700 dark:border-slate-800/70 dark:bg-slate-950/45 dark:text-slate-200
                  "
                >
                  PIN <span className="font-mono tracking-wider">{pin}</span>
                </span>
              </div>
            </div>

            <div
              className="
                hidden sm:flex items-center gap-3
                rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2
                dark:border-slate-800/70 dark:bg-slate-950/45
              "
            >
              <div className="h-10 w-10 overflow-hidden rounded-full bg-white/80 dark:bg-slate-950/40">
                <img src={avatarSrc} alt="Avatar" className="h-10 w-10 object-cover" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {student.name}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {student.studentId}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* WAITING */}
        {phase === "waiting" && (
          <GlassCard className="text-center">
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/45">
                <Sparkles className="h-6 w-6 text-slate-700 dark:text-[#A7F3FF]" />
              </div>

              <div className="space-y-2">
                <h1 className={`${caesar.className} text-3xl sm:text-4xl text-slate-900 dark:text-slate-50`}>
                  BE READY TO ANSWER!
                </h1>
                <h2 className={`${caesar.className} text-2xl sm:text-3xl text-slate-700 dark:text-slate-200`}>
                  GOOD LUCK!
                </h2>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div
                  className="
                    h-20 w-20 overflow-hidden rounded-full
                    border border-slate-200/70 bg-white/80 shadow-sm
                    dark:border-slate-800/70 dark:bg-slate-950/45
                  "
                >
                  <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                </div>

                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">{student.studentId}</span> • {student.name}
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Waiting for host to start…
              </div>
            </div>
          </GlassCard>
        )}

        {/* QUESTION */}
        {phase === "question" && question && (
          <>
            {/* Question header + timer */}
            <GlassCard className="mb-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className="
                    inline-flex items-center gap-2 rounded-2xl
                    border border-slate-200/70 bg-white/70 px-3 py-2 shadow-sm
                    dark:border-slate-800/70 dark:bg-slate-950/45
                  "
                >
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Question
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                    {question.number}/{question.total}
                  </span>
                </div>

                <div className="w-full sm:w-[360px]">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                      <Timer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Time remaining
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {remainingSec}s
                    </span>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-slate-200/70 overflow-hidden dark:bg-slate-800/60">
                    <div
                      className="h-full transition-[width] duration-100"
                      style={{
                        width: `${pctRemaining}%`,
                        background: "linear-gradient(90deg, #00D4FF, #38BDF8, #2563EB)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>


            {/* Answers */}
            <div className="flex justify-center">
              <AnswerGrid
                q={question}
                disabled={disableButtons}
                onSubmitChoice={({ indices }) => submitChoice(indices)}
                onAttemptMatch={async () => ({ correct: false })} // later wire
                onSubmitInput={({ value }) => {
                  // later wire input submit
                }}
              />

            </div>

            <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Tap one choice. You can’t change after picking.
            </div>
          </>
        )}

        {/* RESULT */}
        {phase === "result" && (
          <GlassCard>
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div
                className="
                  rounded-3xl border border-slate-200/70 bg-white/70 p-4
                  dark:border-slate-800/70 dark:bg-slate-950/45
                "
              >
                <Trophy className="h-6 w-6 text-slate-700 dark:text-[#A7F3FF]" />
              </div>

              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
                Result
              </div>

              {lastWasCorrect === true && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Correct! +{lastEarnedPoints} points
                </div>
              )}

              {lastWasCorrect === false && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
                  <XCircle className="h-4 w-4" />
                  Incorrect · +0 points
                </div>
              )}

              {lastWasCorrect === null && (
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Waiting for host reveal…
                </div>
              )}

              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Total correct
              </div>
              <div className={`${caesar.className} text-6xl text-slate-900 dark:text-slate-50`}>
                {correctCount}/{Math.max(1, scoredCount)}
              </div>

              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Total points{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {totalPoints}
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Waiting for the next question…
              </div>
            </div>
          </GlassCard>
        )}

        {/* FINAL */}
        {phase === "final" && (
          <GlassCard>
            <div className="flex flex-col items-center gap-4 py-5 text-center">
              <div
                className="
                  rounded-3xl border border-slate-200/70 bg-white/70 p-4
                  dark:border-slate-800/70 dark:bg-slate-950/45
                "
              >
                <Trophy className="h-6 w-6 text-slate-700 dark:text-[#A7F3FF]" />
              </div>

              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
                Final Score
              </div>

              <div className={`${caesar.className} text-7xl text-slate-900 dark:text-slate-50`}>
                {correctCount}/{finalDenom}
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-300">
                Points earned{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {finalPoints}
                </span>
              </div>

              <PrimaryButton onClick={() => router.push("/me/reports")}>
                Go to My Reports
              </PrimaryButton>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                You can review your attempt anytime.
              </div>
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
}
