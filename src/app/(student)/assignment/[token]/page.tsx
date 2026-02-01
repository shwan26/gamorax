// src/app/(student)/assignment/[token]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import AnswerGrid from "@/src/components/live/AnswerGrid";
import { Trophy, CheckCircle2, XCircle, Timer, Lock } from "lucide-react";

import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import { getAvatarSrc } from "@/src/lib/studentAvatar";
import type { LiveStudent } from "@/src/lib/liveStorage";
import { getOrCreateLiveStudent } from "@/src/lib/liveStudentSession";

import { readAssignmentShareToken } from "@/src/lib/assignmentStorage";
import { saveAssignmentAttempt, listAttemptsByAssignment } from "@/src/lib/assignmentAttemptStorage";

type Phase = "gate" | "intro" | "question" | "answer" | "final";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/* ------------------------------ UI helpers (same style) ------------------------------ */
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

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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

/* ------------------------------ grading helpers ------------------------------ */
function norm(s: any) {
  return String(s ?? "").trim().toLowerCase();
}

function gradeQuestion(q: any, studentAnswer: any): boolean {
  const type = (q?.type ?? "multiple_choice") as string;

  if (type === "multiple_choice" || type === "true_false") {
    const idx = Array.isArray(studentAnswer?.indices) ? studentAnswer.indices[0] : studentAnswer?.index;
    const i = Number(idx);
    if (!Number.isFinite(i)) return false;
    return Boolean(q?.answers?.[i]?.correct);
  }

  if (type === "input") {
    const mine = norm(studentAnswer?.value);
    if (!mine) return false;
    const accepted = (q?.acceptedAnswers ?? []).map(norm).filter(Boolean);
    return accepted.includes(mine);
  }

  if (type === "matching") {
    const matchedCount = Number(studentAnswer?.matchedCount ?? 0);
    const totalPairs = Number(studentAnswer?.totalPairs ?? 0);
    return totalPairs > 0 && matchedCount === totalPairs;
  }

  return false;
}

export default function AssignmentEntryPage() {
  const router = useRouter();
  const params = useParams<{ token?: string }>();
  const token = (params?.token ?? "").trim();

  const [meLive, setMeLive] = useState<LiveStudent | null>(null);
  const avatarSrc = useMemo(() => getAvatarSrc(meLive, 40), [meLive]);

  // decode token
  const decoded = useMemo(() => (token ? readAssignmentShareToken(token) : null), [token]);
  const assignment = decoded?.assignment ?? null;
  const rawQuestions = decoded?.questions ?? [];

  // map questions to AnswerGrid shape
  const questions = useMemo(() => {
    return rawQuestions.map((qq: any, idx: number) => {
      const type = qq?.type ?? "multiple_choice";

      if (type === "true_false") {
        // safety: ensure answers exist
        const ans = Array.isArray(qq?.answers) && qq.answers.length >= 2
          ? qq.answers
          : [{ text: "True" }, { text: "False" }];

        return { ...qq, answers: ans, questionIndex: idx, number: idx + 1, total: rawQuestions.length };
      }

      if (type === "matching") {
        const pairs = Array.isArray(qq?.matches) ? qq.matches : [];
        return {
          ...qq,
          questionIndex: idx,
          number: idx + 1,
          total: rawQuestions.length,
          left: pairs.map((p: any) => String(p?.left ?? "")),
          right: pairs.map((p: any) => String(p?.right ?? "")),
        };
      }

      return { ...qq, questionIndex: idx, number: idx + 1, total: rawQuestions.length };
    });
  }, [rawQuestions]);

  // phase + timing
  const [phase, setPhase] = useState<Phase>("gate");
  const [now, setNow] = useState(Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [qIndex, setQIndex] = useState(0);

  // scoring
  const [correctCount, setCorrectCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);

  const answersRef = useRef<Record<string, any>>({});
  const matchedPairsRef = useRef<Map<number, number>>(new Map());

  // passcode gate
  const [passcode, setPasscode] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);

  useEffect(() => {
    // timer tick
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // require login (like live)
  useEffect(() => {
    if (!token) return;
    (async () => {
      const me = await getCurrentStudent();
      if (!me) {
        router.replace(`/auth/login?next=${encodeURIComponent(`/assignment/${token}`)}`);
      }
    })();
  }, [token, router]);

  // load live student (avatar/name)
  useEffect(() => {
    (async () => {
      const live = await getOrCreateLiveStudent();
      if (live) setMeLive(live);
    })();
  }, []);

  const guard = useMemo(() => {
    if (!assignment) return { ok: false, reason: "Invalid assignment link." };
    const n = Date.now();
    if (assignment.opensAt && n < new Date(assignment.opensAt).getTime()) {
      return { ok: false, reason: `Not open yet. Opens at ${new Date(assignment.opensAt).toLocaleString()}` };
    }
    if (assignment.dueAt && n > new Date(assignment.dueAt).getTime()) {
      return { ok: false, reason: `Expired. Due at ${new Date(assignment.dueAt).toLocaleString()}` };
    }
    return { ok: true, reason: "" };
  }, [assignment]);

  // one-attempt check (client-side)
  const alreadyAttempted = useMemo(() => {
    if (!assignment) return false;
    const me = await getCurrentStudent();
    if (!me?.email) return false;
    const email = String(me.email).toLowerCase();
    const attempts = listAttemptsByAssignment(assignment.id);
    return attempts.some((a) => String(a.studentEmail).toLowerCase() === email);
  }, [assignment]);

  const endAt = useMemo(() => {
    if (!startedAt || !assignment) return null;
    return startedAt + Number(assignment.durationSec ?? 0) * 1000;
  }, [startedAt, assignment]);

  const timeLeft = useMemo(() => {
    if (!endAt) return null;
    return Math.max(0, Math.ceil((endAt - now) / 1000));
  }, [endAt, now]);

  const isTimeUp = useMemo(() => (timeLeft !== null ? timeLeft <= 0 : false), [timeLeft]);

  useEffect(() => {
    if (phase !== "question") return;
    if (!isTimeUp) return;
    setPhase("final");
  }, [phase, isTimeUp]);

  const q = questions[qIndex];
  const disabled = phase !== "question" || isTimeUp;

  function start() {
    if (!guard.ok) return;
    setStartedAt(Date.now());
    setPhase("question");
  }

  function nextQuestionOrFinal() {
    const next = qIndex + 1;
    if (next >= questions.length) {
      setPhase("final");
      return;
    }
    matchedPairsRef.current = new Map();
    setQIndex(next);
    setPhase("question");
  }

  async function finalizeAndSave() {
    if (!assignment) return;
    const studentAuth = await getCurrentStudent();
    const live = meLive;

    const studentEmail = String(studentAuth?.email ?? "").toLowerCase();
    const studentId = String(live?.studentId ?? studentAuth?.studentId ?? "");
    const studentName = String(live?.name ?? studentAuth?.name ?? "Student");

    const total = questions.length;
    const correct = correctCount;
    const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;

    saveAssignmentAttempt({
      id: crypto.randomUUID(),
      assignmentId: assignment.id,
      studentEmail,
      studentId,
      studentName,
      startedAt: new Date(startedAt ?? Date.now()).toISOString(),
      submittedAt: new Date().toISOString(),
      totalQuestions: total,
      correct,
      scorePct,
      answers: answersRef.current,
    });
  }

  const finalSavedRef = useRef(false);
  useEffect(() => {
    if (phase !== "final") return;
    if (finalSavedRef.current) return;
    finalSavedRef.current = true;
    finalizeAndSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function submitChoice(indices: number[]) {
    if (!q) return;
    const qid = String(q.id ?? q.questionIndex);
    answersRef.current[qid] = { indices };

    const isCorrect = gradeQuestion(q, { indices });
    const pointsEarned = isCorrect ? 100 : 0;

    setLastWasCorrect(isCorrect);
    setLastEarnedPoints(pointsEarned);
    setCorrectCount((c) => c + (isCorrect ? 1 : 0));
    setTotalPoints((p) => p + pointsEarned);

    setPhase("answer");
    window.setTimeout(() => nextQuestionOrFinal(), 650);
  }

  function submitInput(value: string) {
    if (!q) return;
    const qid = String(q.id ?? q.questionIndex);
    answersRef.current[qid] = { value };

    const isCorrect = gradeQuestion(q, { value });
    const pointsEarned = isCorrect ? 100 : 0;

    setLastWasCorrect(isCorrect);
    setLastEarnedPoints(pointsEarned);
    setCorrectCount((c) => c + (isCorrect ? 1 : 0));
    setTotalPoints((p) => p + pointsEarned);

    setPhase("answer");
    window.setTimeout(() => nextQuestionOrFinal(), 650);
  }

  async function attemptMatch(leftIndex: number, rightIndex: number): Promise<{ correct: boolean }> {
    const correct = leftIndex === rightIndex;
    if (correct) matchedPairsRef.current.set(leftIndex, rightIndex);

    const totalPairs = Array.isArray(q?.left) ? q.left.length : 0;

    if (correct && matchedPairsRef.current.size === totalPairs) {
      const qid = String(q.id ?? q.questionIndex);
      answersRef.current[qid] = { matchedCount: matchedPairsRef.current.size, totalPairs };

      const isCorrect = gradeQuestion(q, { matchedCount: matchedPairsRef.current.size, totalPairs });
      const pointsEarned = isCorrect ? 100 : 0;

      setLastWasCorrect(isCorrect);
      setLastEarnedPoints(pointsEarned);
      setCorrectCount((c) => c + (isCorrect ? 1 : 0));
      setTotalPoints((p) => p + pointsEarned);

      setPhase("answer");
      window.setTimeout(() => nextQuestionOrFinal(), 650);
    }

    return { correct };
  }

  // ---------- render guards ----------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <GlassCard>Missing assignment token.</GlassCard>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <GlassCard>Invalid assignment link.</GlassCard>
        </div>
      </div>
    );
  }

  if (!guard.ok) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <GlassCard>{guard.reason}</GlassCard>
        </div>
      </div>
    );
  }

  if (alreadyAttempted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <GlassCard>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              You already submitted this assignment.
            </div>
            <div className="mt-4">
              <PrimaryButton onClick={() => router.push("/me/reports")}>Go to My Reports</PrimaryButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ---------- PASSCODE GATE ----------
  // (MVP) expects assignment.passcode to exist in the token payload (not secure, but works for demo)
  const requiredPasscode = (assignment as any)?.passcode ? String((assignment as any).passcode) : "";

  function verifyPasscode() {
    setGateError(null);
    if (!requiredPasscode) {
      // no passcode set -> allow
      setPhase("intro");
      return;
    }
    if (passcode.trim() !== requiredPasscode.trim()) {
      setGateError("Incorrect passcode.");
      return;
    }
    setPhase("intro");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-5 sm:py-6">
        {phase === "gate" ? (
          <GlassCard className="mb-6">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <Lock className="h-4 w-4" />
              <div className="text-sm font-extrabold">Enter passcode</div>
            </div>

            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {assignment.title} • {questions.length} questions
            </div>

            <div className="mt-4 space-y-3 max-w-md">
              <input
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode"
                className="
                  w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-base
                  font-semibold text-slate-800 shadow-sm outline-none
                  focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                  dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                "
              />
              {gateError ? (
                <div className="text-sm font-semibold text-rose-600 dark:text-rose-300">{gateError}</div>
              ) : null}

              <PrimaryButton onClick={verifyPasscode}>Continue</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {/* intro */}
        {phase === "intro" ? (
          <GlassCard className="mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
                <img src={avatarSrc} alt="Avatar" className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">
                  {meLive?.name ?? "Student"}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Assignment • {questions.length} questions
                </div>
              </div>
            </div>

            <h1 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-slate-50">
              {assignment.title}
            </h1>

            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Duration: <span className="font-semibold">{assignment.durationSec}s</span>
              {assignment.dueAt ? (
                <>
                  {" "}
                  • Due: <span className="font-semibold">{new Date(assignment.dueAt).toLocaleString()}</span>
                </>
              ) : null}
            </div>

            <div className="mt-5">
              <PrimaryButton onClick={start}>Start</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {/* header */}
        {phase !== "gate" && phase !== "intro" && phase !== "final" ? (
          <GlassCard className="mb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/40">
                    <img src={avatarSrc} alt="Avatar" className="h-10 w-10" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">
                      {meLive?.name ?? "Student"}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Q{qIndex + 1} / {questions.length}
                    </div>
                  </div>
                </div>

                <h1 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-slate-50">
                  {q?.text ?? "Question"}
                </h1>
              </div>

              <div className="w-full sm:w-[360px] sm:shrink-0">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <Timer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Time remaining
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {timeLeft ?? "-"}s
                  </span>
                </div>

                <div className="mt-2 h-2 rounded-full bg-slate-200/70 overflow-hidden dark:bg-slate-800/60">
                  <div
                    className="h-full transition-[width] duration-100"
                    style={{
                      width:
                        startedAt && endAt && assignment.durationSec > 0
                          ? `${(clamp((endAt - now) / 1000, 0, assignment.durationSec) / assignment.durationSec) * 100}%`
                          : "0%",
                      background: "linear-gradient(90deg, #00D4FF, #38BDF8, #2563EB)",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              {phase === "answer" && lastWasCorrect === true ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  Correct! +{lastEarnedPoints} points
                </div>
              ) : phase === "answer" && lastWasCorrect === false ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200">
                  <XCircle className="h-4 w-4" />
                  Incorrect · +0 points
                </div>
              ) : (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">Answer now</p>
              )}

              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Total correct: <span className="font-semibold">{correctCount}</span> • Total points:{" "}
                <span className="font-semibold">{totalPoints}</span>
              </div>
            </div>
          </GlassCard>
        ) : null}

        {/* Final */}
        {phase === "final" ? (
          <GlassCard className="mb-6">
            <div className="flex flex-col items-center gap-4 py-5 text-center">
              <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/45">
                <Trophy className="h-6 w-6 text-slate-700 dark:text-[#A7F3FF]" />
              </div>

              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">Final Score</div>

              <div className="text-5xl sm:text-7xl font-extrabold text-slate-900 dark:text-slate-50">
                {correctCount}/{questions.length || 1}
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-300">
                Points earned{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-50">{totalPoints}</span>
              </div>

              <PrimaryButton onClick={() => router.push("/me/reports")}>Go to My Reports</PrimaryButton>
            </div>
          </GlassCard>
        ) : null}

        {/* Answer Grid */}
        {phase === "question" ? (
          <div className="mt-6">
            <AnswerGrid
              q={q}
              disabled={disabled}
              mode="assignment"
              onSubmitChoice={({ indices }) => submitChoice(indices)}
              onSubmitInput={({ value }) => submitInput(value)}
              onAttemptMatch={q?.type === "matching" ? ({ leftIndex, rightIndex }) => attemptMatch(leftIndex, rightIndex) : undefined}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
