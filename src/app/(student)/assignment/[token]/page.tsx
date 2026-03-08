"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/src/components/Navbar";
import AnswerGrid from "@/src/components/live/AnswerGrid";
import { Trophy, Timer, Lock, CheckCircle2, XCircle, Clock } from "lucide-react";

import { supabase } from "@/src/lib/supabaseClient";
import { getOrCreateLiveStudent } from "@/src/lib/liveStudentSession";
import { getAvatarSrc } from "@/src/lib/studentAvatar";

import {
  getAssignmentMeta,
  getAssignmentPayload,
  submitAssignmentAttempt,
  type AssignmentMeta,
  type AssignmentPayload,
} from "@/src/lib/assignmentStorage";

import { hasAttempted } from "@/src/lib/assignmentAttemptStorage";

type Phase = "gate" | "intro" | "question" | "final";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
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

export default function AssignmentEntryPage() {
  const router = useRouter();
  const params = useParams<{ token?: string }>();
  const token = (params?.token ?? "").trim();

  const [phase, setPhase] = useState<Phase>("gate");

  const [meta, setMeta] = useState<AssignmentMeta | null>(null);
  const [payload, setPayload] = useState<AssignmentPayload | null>(null);

  const [meLive, setMeLive] = useState<any>(null);
  const avatarSrc = useMemo(() => getAvatarSrc(meLive, 40), [meLive]);

  const [passcode, setPasscode] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [alreadyAttempted, setAlreadyAttempted] = useState(false);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [qIndex, setQIndex] = useState(0);

  const [result, setResult] = useState<{
    correct: number;
    total: number;
    score: number;
    timeSpentSec: number;
  } | null>(null);

  const answersRef = useRef<Record<string, any>>({});
  const startedAtRef = useRef<number | null>(null);
  const finalSavedRef = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // require login
  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent(`/assignment/${token}`)}`);
      }
    })();
  }, [token, router]);

  // load live student
  useEffect(() => {
    (async () => {
      const live = await getOrCreateLiveStudent();
      if (live) setMeLive(live);
    })();
  }, []);

  // load meta
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      try {
        const m = await getAssignmentMeta(token);
        if (!cancelled) setMeta(m);
      } catch {
        if (!cancelled) setMeta(null);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // check already attempted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!meta?.id) { if (!cancelled) setAlreadyAttempted(false); return; }
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) { if (!cancelled) setAlreadyAttempted(false); return; }
      try {
        const yes = await hasAttempted(meta.id, uid);
        if (!cancelled) setAlreadyAttempted(yes);
      } catch {
        if (!cancelled) setAlreadyAttempted(false);
      }
    })();
    return () => { cancelled = true; };
  }, [meta?.id]);

  const guard = useMemo(() => {
    if (!meta) return { ok: false, reason: "Invalid assignment link." };
    const n = Date.now();
    if (meta.opens_at && n < new Date(meta.opens_at).getTime())
      return { ok: false, reason: `Not open yet. Opens at ${new Date(meta.opens_at).toLocaleString()}` };
    if (meta.due_at && n > new Date(meta.due_at).getTime())
      return { ok: false, reason: `Expired. Due at ${new Date(meta.due_at).toLocaleString()}` };
    return { ok: true, reason: "" };
  }, [meta]);

  const questions = useMemo(() => {
    const raw =
      (payload as any)?.questions ??
      (payload as any)?.payload?.questions ??
      (payload as any)?.data?.questions ??
      [];
    return (Array.isArray(raw) ? raw : []).map((qq: any, idx: number) => {
      const type = qq?.type ?? "multiple_choice";
      if (type === "matching") {
        return { ...qq, questionIndex: idx, number: idx + 1, total: raw.length,
          left: Array.isArray(qq.left) ? qq.left : [],
          right: Array.isArray(qq.right) ? qq.right : [] };
      }
      return { ...qq, questionIndex: idx, number: idx + 1, total: raw.length };
    });
  }, [payload]);

  const endAt = useMemo(() => {
    if (!startedAt || !meta) return null;
    return startedAt + Number(meta.duration_sec ?? 0) * 1000;
  }, [startedAt, meta]);

  const timeLeft = useMemo(() => {
    if (!endAt) return null;
    return Math.max(0, Math.ceil((endAt - now) / 1000));
  }, [endAt, now]);

  const isTimeUp = useMemo(() => timeLeft !== null ? timeLeft <= 0 : false, [timeLeft]);

  useEffect(() => {
    if (phase !== "question") return;
    if (!isTimeUp) return;
    setPhase("final");
  }, [phase, isTimeUp]);

  const q = questions[qIndex];
  const disabled = phase !== "question" || isTimeUp;

  async function verifyAndLoad() {
    setGateError(null);
    if (!guard.ok) return;
    try {
      const p = await getAssignmentPayload(token, meta?.has_passcode ? passcode : undefined);
      setPayload(p);
      setPhase("intro");
    } catch (e: any) {
      setGateError(e?.message ?? "Cannot open assignment.");
    }
  }

  function start() {
    if (!guard.ok) return;
    answersRef.current = {};
    finalSavedRef.current = false;
    const ts = Date.now();
    startedAtRef.current = ts;
    setStartedAt(ts);
    setQIndex(0);
    setResult(null);
    setSubmitError(null);
    setPhase("question");
  }

  function nextQuestionOrFinal() {
    const next = qIndex + 1;
    if (next >= questions.length) { setPhase("final"); return; }
    setQIndex(next);
  }

  function submitChoice(indices: number[]) {
    if (!q) return;
    answersRef.current[String(q.id ?? q.questionIndex)] = { indices };
    nextQuestionOrFinal();
  }

  function submitInput(value: string) {
    if (!q) return;
    answersRef.current[String(q.id ?? q.questionIndex)] = { value };
    nextQuestionOrFinal();
  }

  async function attemptMatch(leftIndex: number, rightIndex: number): Promise<{ correct: boolean }> {
    return { correct: true };
  }

  // ── SUBMIT on final ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "final") return;
    if (finalSavedRef.current) return;
    finalSavedRef.current = true;

    (async () => {
      try {
        const startedAtISO = new Date(startedAtRef.current ?? Date.now()).toISOString();
        const res = await submitAssignmentAttempt({
          token,
          startedAtISO,
          answers: answersRef.current,
        });

        setResult({
          correct:      res.correct,
          total:        res.totalQuestions,
          score:        res.score,
          timeSpentSec: res.timeSpentSec,
        });
      } catch (rawErr: unknown) {
        const msg =
          (rawErr as any)?.message ||
          (rawErr as any)?.code ||
          (rawErr as any)?.details ||
          String(rawErr) ||
          "Submit failed";
        setSubmitError(msg);
      }
    })();
  }, [phase, token]);

  // Reset on token change
  useEffect(() => {
    answersRef.current = {};
    startedAtRef.current = null;
    finalSavedRef.current = false;
    setResult(null);
    setStartedAt(null);
    setQIndex(0);
    setPhase("gate");
    setPayload(null);
    setGateError(null);
    setSubmitError(null);
    setPasscode("");
  }, [token]);

  // ---------- render guards ----------
  if (!token) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><Navbar /><div className="mx-auto max-w-3xl px-4 py-6"><GlassCard>Missing assignment token.</GlassCard></div></div>;
  if (!meta) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><Navbar /><div className="mx-auto max-w-3xl px-4 py-6"><GlassCard>Loading assignment...</GlassCard></div></div>;
  if (!guard.ok) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><Navbar /><div className="mx-auto max-w-3xl px-4 py-6"><GlassCard>{guard.reason}</GlassCard></div></div>;

  if (alreadyAttempted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <GlassCard>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">You already submitted this assignment.</div>
            <div className="mt-4"><PrimaryButton onClick={() => router.push("/me/reports")}>Go to My Reports</PrimaryButton></div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-5 sm:py-6">

        {/* Gate */}
        {phase === "gate" && (
          <GlassCard className="mb-6">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <Lock className="h-4 w-4" />
              <div className="text-sm font-extrabold">{meta.has_passcode ? "Enter passcode" : "Ready"}</div>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {meta.title} • Duration {meta.duration_sec}s
            </div>
            {meta.has_passcode ? (
              <div className="mt-4 space-y-3 max-w-md">
                <input
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void verifyAndLoad(); }}
                  placeholder="Passcode"
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 text-base font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-[#00D4FF]/50 dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100"
                />
                {gateError && <div className="text-sm font-semibold text-rose-600 dark:text-rose-300">{gateError}</div>}
                <PrimaryButton onClick={() => void verifyAndLoad()}>Continue</PrimaryButton>
              </div>
            ) : (
              <div className="mt-4">
                {gateError && <div className="mb-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{gateError}</div>}
                <PrimaryButton onClick={() => void verifyAndLoad()}>Continue</PrimaryButton>
              </div>
            )}
          </GlassCard>
        )}

        {/* Intro */}
        {phase === "intro" && (
          <GlassCard className="mb-6">
            {questions.length === 0 && (
              <div className="mb-4 text-sm font-semibold text-rose-600">
                Warning: No questions found in payload.
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/70">
                <img src={avatarSrc} alt="Avatar" className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">{meLive?.name ?? "Student"}</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Assignment • {questions.length} questions</div>
              </div>
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-slate-50">{meta.title}</h1>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Duration: <span className="font-semibold">{meta.duration_sec}s</span>
              {meta.due_at && <> • Due: <span className="font-semibold">{new Date(meta.due_at).toLocaleString()}</span></>}
            </div>
            <div className="mt-5"><PrimaryButton onClick={start}>Start</PrimaryButton></div>
          </GlassCard>
        )}

        {/* Question header + timer */}
        {phase === "question" && (
          <GlassCard className="mb-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                Q{qIndex + 1} / {questions.length}
              </div>
              <div className="inline-flex items-center gap-2">
                <Timer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{timeLeft ?? "-"}s</span>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200/70 overflow-hidden dark:bg-slate-800/60">
              <div
                className="h-full transition-[width] duration-100"
                style={{
                  width: startedAt && endAt && meta.duration_sec > 0
                    ? `${(clamp((endAt - now) / 1000, 0, meta.duration_sec) / meta.duration_sec) * 100}%`
                    : "0%",
                  background: "linear-gradient(90deg, #00D4FF, #38BDF8, #2563EB)",
                }}
              />
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-slate-50">{q?.text ?? "Question"}</h1>
          </GlassCard>
        )}

        {/* ── FINAL card ── */}
        {phase === "final" && (
          <GlassCard className="mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/70">
                <img src={avatarSrc} alt="Avatar" className="h-10 w-10" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">{meLive?.name ?? "Student"}</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {meta.title} • {questions.length} questions
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/45">
                <Trophy className="h-6 w-6 text-slate-700 dark:text-[#A7F3FF]" />
              </div>

              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">Final Score</div>

              {result ? (
                <>
                  {/* correct / total */}
                  <div className="text-7xl font-extrabold text-slate-900 dark:text-slate-50">
                    {result.correct}/{result.total}
                  </div>

                  {/* 2-stat row: Score | Time */}
                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-2">
                    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/45 text-center">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Score</div>
                      <div className="text-xl font-extrabold text-[#2563EB] dark:text-[#A7F3FF] tabular-nums">
                        {result.score}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/45 text-center">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" /> Time
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tabular-nums">
                        {formatTime(result.timeSpentSec)}
                      </div>
                    </div>
                  </div>

                  {/* correct / wrong breakdown */}
                  <div className="w-full max-w-xs mt-1">
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        {result.correct} correct
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold">
                        <XCircle className="h-4 w-4" />
                        {result.total - result.correct} wrong
                      </span>
                    </div>
                  </div>
                </>
              ) : submitError ? (
                <div className="space-y-3 w-full max-w-sm">
                  <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-300">
                    Submit failed: {submitError}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Check the browser console for details. Your answers were recorded locally.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB] dark:border-slate-700 dark:border-t-[#38BDF8]" />
                  <div className="text-sm text-slate-500 dark:text-slate-400">Submitting your answers…</div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <PrimaryButton onClick={() => router.push("/me/reports")}>Go to My Reports</PrimaryButton>
            </div>
          </GlassCard>
        )}

        {/* Answer Grid */}
        {phase === "question" && (
          <div className="mt-6">
            <AnswerGrid
              q={q}
              disabled={disabled}
              mode="assignment"
              onSubmitChoice={({ indices }) => submitChoice(indices)}
              onSubmitInput={({ value }) => submitInput(value)}
              onAttemptMatch={
                q?.type === "matching"
                  ? ({ leftIndex, rightIndex }) => attemptMatch(leftIndex, rightIndex)
                  : undefined
              }
              onSubmitMatching={
                q?.type === "matching"
                  ? ({ pairs }) => {
                      answersRef.current[String(q.id ?? q.questionIndex)] = { pairs };
                      nextQuestionOrFinal();
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}