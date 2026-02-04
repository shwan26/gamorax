// src/components/live/LecturerLiveFlow.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getQuestions, type Question } from "@/src/lib/questionStorage";
import { socket } from "@/src/lib/socket";
import { getLiveStateByPin, type LiveReportRow, saveLiveReport } from "@/src/lib/liveStorage";
import LecturerLiveLayout from "./LecturerLiveLayout";
import { supabase } from "@/src/lib/supabaseClient";

/* ---------------- helpers ---------------- */

function getDurationSec(q: any): number {
  const t = Number(q?.time);
  if (Number.isFinite(t) && t > 0) return Math.min(60 * 60, Math.round(t));
  return 20;
}

function shuffleArray<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toCorrectIndices(q: any): number[] {
  if (!q) return [];
  const ans = Array.isArray(q.answers) ? q.answers : [];
  return ans
    .map((a: any, i: number) => (a?.correct ? i : -1))
    .filter((i: number) => i >= 0);
}

export default function LecturerLiveFlow({
  mode = "live",
  courseId,
  gameId,
  pin,
  course,
  game,
}: {
  mode?: "live" | "preview";
  courseId: string;
  gameId: string;
  pin: string; // live only; preview can pass ""
  course: any;
  game: any;
}) {
  const s = socket;

  const valid = !!course && !!game && game.courseId === courseId;
  if (!valid) return <div className="p-10">Invalid course/game.</div>;

  // ✅ preview doesn't need pin, but we still want stable storage keys
  const pinKey = mode === "preview" ? `__preview__${gameId}` : pin;

  // ✅ what we display on UI
  const pinDisplay = mode === "preview" ? "PREVIEW" : pin;

  // ✅ live still enforces pin
  if (mode === "live" && !pin) {
    return <div className="p-10">PIN missing. Go back to Live lobby.</div>;
  }

  const shuffleQuestions = Boolean(game?.shuffleQuestions);
  const shuffleAnswers = Boolean(game?.shuffleAnswers);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [liveOrder, setLiveOrder] = useState<number[]>([]);

  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "live" || !pin) return;
    let alive = true;

    (async () => {
      try {
        const st = await getLiveStateByPin(pin);
        if (alive) setSessionId(st?.sessionId ?? null);
      } catch {
        if (alive) setSessionId(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mode, pin]);


  useEffect(() => {
    let alive = true;
    (async () => {
      if (!valid || !gameId) {
        if (alive) setQuestions([]);
        return;
      }
      try {
        const qs = await getQuestions(gameId);
        if (alive) setQuestions(qs ?? []);
      } catch {
        if (alive) setQuestions([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [valid, gameId]);

  // ✅ stable question order (per pinKey, works in preview too)
  useEffect(() => {
    if (!pinKey || !gameId) return;
    if (!questions.length) return;

    const key = `gamorax_live_qorder_${pinKey}_${gameId}`;
    const saved = sessionStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === questions.length) {
          setLiveOrder(parsed);
          return;
        }
      } catch {}
    }

    const base = [...Array(questions.length)].map((_, i) => i);
    const next = shuffleQuestions ? shuffleArray(base) : base;
    sessionStorage.setItem(key, JSON.stringify(next));
    setLiveOrder(next);
  }, [pinKey, gameId, questions.length, shuffleQuestions]);

  const [status, setStatus] = useState<"question" | "answer" | "final">("question");
  const [qIndex, setQIndex] = useState(0);

  const baseIndex = liveOrder[qIndex] ?? qIndex;
  const baseQ = questions[baseIndex];

  // ✅ stable answer order for MC (per pinKey)
  const getOrCreateAnswerOrder = (liveQIndex: number, optionCount: number) => {
    const key = `gamorax_live_aorder_${pinKey}_${gameId}_${liveQIndex}_${optionCount}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === optionCount) return parsed as number[];
      } catch {}
    }
    const base = [...Array(optionCount)].map((_, i) => i);
    const order = shuffleAnswers ? shuffleArray(base) : base;
    sessionStorage.setItem(key, JSON.stringify(order));
    return order;
  };

  // ✅ stable matching right-side order (per pinKey)
  const getOrCreateMatchOrder = (liveQIndex: number, optionCount: number) => {
    const key = `gamorax_live_match_v2_R_${pinKey}_${gameId}_${liveQIndex}_${optionCount}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === optionCount) return parsed as number[];
      } catch {}
    }
    const base = [...Array(optionCount)].map((_, i) => i);
    const order = shuffleArray(base);
    sessionStorage.setItem(key, JSON.stringify(order));
    return order;
  };

  const q = useMemo(() => {
    if (!baseQ) return null;

    // MC / TF
    if (baseQ.type === "multiple_choice" || baseQ.type === "true_false") {
      const options =
        baseQ.type === "true_false"
          ? [
              { text: "True", correct: true },
              { text: "False", correct: false },
            ]
          : (baseQ.answers ?? []).slice(0, 5);

      const order =
        baseQ.type === "true_false" ? [0, 1] : getOrCreateAnswerOrder(qIndex, options.length);

      const ordered = order.map((i) => options[i]).filter(Boolean);

      const originalCorrect = options
        .map((a: any, i: number) => (a?.correct ? i : -1))
        .filter((i: number) => i >= 0);

      const correctInDisplay = new Set(originalCorrect.map((i) => order.indexOf(i)));

      const displayAnswers = ordered.map((a: any, idx: number) => ({
        ...a,
        correct: correctInDisplay.has(idx),
      }));

      return { ...baseQ, answers: displayAnswers };
    }

    // Matching
    if (baseQ.type === "matching") {
      const pairs = (baseQ.matches ?? []).slice(0, 5);
      const left = pairs.map((p: any) => String(p?.left ?? ""));
      const rightBase = pairs.map((p: any) => String(p?.right ?? ""));
      const rightOrder = getOrCreateMatchOrder(qIndex, rightBase.length);
      const right = rightOrder.map((i) => rightBase[i]).filter(Boolean);
      return { ...baseQ, left, right, matches: pairs };
    }

    // Input
    return { ...baseQ };
  }, [baseQ?.id, baseQ?.type, qIndex, gameId, shuffleAnswers, pinKey]);

  /* ---------------- socket + counts ---------------- */

  const [joinedCount, setJoinedCount] = useState(0);
  const [counts, setCounts] = useState<number[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);

  // ✅ join room only in LIVE
  useEffect(() => {
    if (mode !== "live") return;
    if (!pin) return;

    s.connect();

    const doJoin = () => s.emit("lecturer:join", { pin });
    if (s.connected) doJoin();
    s.on("connect", doJoin);

    return () => {
      s.off("connect", doJoin);
    };
  }, [mode, pin, s]);

  // ✅ joined count only in LIVE
  useEffect(() => {
    if (mode !== "live") return;

    const onJoined = (p: any) => {
      const n = Number(p?.totalJoined ?? p?.total ?? p?.count ?? 0);
      if (Number.isFinite(n) && n >= 0) setJoinedCount(n);
    };

    s.on("room:count", onJoined);
    s.on("join:count", onJoined);
    s.on("room:joined", onJoined);

    return () => {
      s.off("room:count", onJoined);
      s.off("join:count", onJoined);
      s.off("room:joined", onJoined);
    };
  }, [mode, s]);

  // ✅ answer count only in LIVE
  useEffect(() => {
    if (mode !== "live") return;

    const onCount = (p: any) => {
      if (!p) return;
      if (p.questionIndex !== qIndex) return;
      if (!Array.isArray(p.counts)) return;

      const incoming = p.counts.map((x: any) => Math.max(0, Number(x ?? 0)));

      const optionCount =
        q?.type === "true_false"
          ? 2
          : q?.type === "multiple_choice"
          ? Math.min(5, (q as any)?.answers?.length ?? incoming.length)
          : incoming.length;

      const next = incoming.slice(0, optionCount);

      setCounts(next);
      const totalAnswers = Number(p.totalAnswers ?? 0);
      setAnsweredCount(
        Number.isFinite(totalAnswers) && totalAnswers >= 0
          ? totalAnswers
          : next.reduce((sum: number, v: number) => sum + v, 0)
      );
    };

    s.on("answer:count", onCount);
    return () => {
      s.off("answer:count", onCount);
    };
  }, [mode, qIndex, q?.type, (q as any)?.answers?.length, s]);

  /* ---------------- timer + show question ---------------- */

  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationSec, setDurationSec] = useState<number>(20);
  const [now, setNow] = useState<number>(() => Date.now());
  const autoRevealedRef = useRef(false);
  const lastShowKeyRef = useRef<string>("");

  // ✅ show question (works in preview too; emits only in live)
  useEffect(() => {
    if (!q || status !== "question") return;
    if (!gameId) return;

    const showKey = `${pinKey}|${gameId}|${qIndex}|${q?.id ?? ""}|${q?.type ?? ""}`;
    if (lastShowKeyRef.current === showKey) return;
    lastShowKeyRef.current = showKey;

    const dur = getDurationSec(q);
    const sAt = Date.now();

    setStartAt(sAt);
    setDurationSec(dur);
    setNow(Date.now());
    autoRevealedRef.current = false;

    const optionCount =
      q.type === "true_false"
        ? 2
        : q.type === "multiple_choice"
        ? Math.min(5, ((q as any).answers ?? []).length)
        : 0;

    setCounts(Array.from({ length: optionCount }, () => 0));
    setAnsweredCount(0);

    const common = {
      questionIndex: qIndex,
      number: qIndex + 1,
      total: questions.length,
      text: q.text ?? "",
      image: (q as any).image ?? null,
      type: q.type ?? "multiple_choice",
      startAt: sAt,
      durationSec: dur,
    };

    if (mode !== "live") return; // ✅ preview stops here (UI timer still runs)

    // ✅ live emits
    if (q.type === "multiple_choice" || q.type === "true_false") {
      const answersText = ((q as any).answers ?? []).map((a: any) => a.text ?? "");
      const correctIndices = toCorrectIndices(q);
      s.emit("question:show", {
        pin,
        question: {
          ...common,
          answers: answersText,
          allowMultiple: correctIndices.length > 1,
          correctIndices,
        },
      });
      return;
    }

    if (q.type === "matching") {
      const pairs = ((q as any).matches ?? []).slice(0, 5);
      const left = Array.isArray((q as any).left)
        ? (q as any).left
        : pairs.map((p: any) => String(p?.left ?? ""));
      const right = Array.isArray((q as any).right)
        ? (q as any).right
        : pairs.map((p: any) => String(p?.right ?? ""));
      s.emit("question:show", {
        pin,
        question: { ...common, left, right, correctPairs: pairs },
      });
      return;
    }

    // input
    s.emit("question:show", {
      pin,
      question: {
        ...common,
        acceptedAnswers: (((q as any).acceptedAnswers ?? []) as string[]).filter(Boolean),
      },
    });
  }, [mode, pin, pinKey, gameId, q?.id, q?.type, status, qIndex, questions.length, s]);

  useEffect(() => {
    if (status !== "question") return;
    if (!startAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [status, startAt]);

  useEffect(() => {
    if (status !== "question") return;
    if (!q || !startAt) return;
    const elapsedMs = now - startAt;
    const limitMs = durationSec * 1000;
    if (elapsedMs >= limitMs && !autoRevealedRef.current) {
      autoRevealedRef.current = true;
      showAnswer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, status, startAt, durationSec, q?.id]);

  function showAnswer(isAuto = false) {
    if (!q) return;
    if (mode === "live" && !pin) return;

    autoRevealedRef.current = true;
    setStartAt(null);

    if (q.type === "multiple_choice" || q.type === "true_false") {
      const correct = toCorrectIndices(q);
      if (!correct.length) {
        if (!isAuto) alert("Correct answer not found.");
        return;
      }
      if (mode === "live") {
        s.emit("reveal", { pin, questionIndex: qIndex, type: q.type, correctIndices: correct });
      }
      setStatus("answer");
      return;
    }

    if (q.type === "matching") {
      const pairs = ((q as any).matches ?? []).slice(0, 5);
      if (mode === "live") {
        s.emit("reveal", { pin, questionIndex: qIndex, type: "matching", correctPairs: pairs });
      }
      setStatus("answer");
      return;
    }

    if (mode === "live") {
      s.emit("reveal", {
        pin,
        questionIndex: qIndex,
        type: "input",
        acceptedAnswers: (((q as any).acceptedAnswers ?? []) as string[]).filter(Boolean),
      });
    }
    setStatus("answer");
  }

  /* ---------------- leaderboard / final ---------------- */

  const [ranked, setRanked] = useState<any[]>([]);

  useEffect(() => {
    if (mode !== "live") return;

    const onLb = (p: any) => {
      if (Array.isArray(p?.leaderboard)) setRanked(p.leaderboard);
    };

    const onFinal = (p: any) => {
      (async () => {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          console.warn("Not logged in - cannot save report");
          return;
        }

        const lb = Array.isArray(p?.leaderboard) ? p.leaderboard : [];
        if (lb.length > 0) setRanked(lb);
        setStatus("final");

        const rows: LiveReportRow[] = [...lb]
          .sort((a: any, b: any) => Number(b.points ?? 0) - Number(a.points ?? 0))
          .map((r: any, idx: number) => ({
            rank: idx + 1,
            studentId: String(r.studentId ?? ""),
            name: String(r.name ?? ""),
            score: Number(r.correct ?? 0),
            points: Number(r.points ?? 0),
            totalTime: Number(r.totalTime ?? 0),
          }));

        const nowIso = new Date().toISOString();

        // inside onFinal
        const sid = sessionId ?? (await getLiveStateByPin(pin))?.sessionId ?? null;

        if (!sid) {
          console.error("Cannot save report: sessionId is null (pin not found / session ended?)");
          return;
        }

        await saveLiveReport({
          id: crypto.randomUUID(),
          sessionId: sid,
          quizId: gameId,
          pin,
          courseCode: course?.courseCode ?? null,
          courseName: course?.courseName ?? null,
          section: course?.section ?? null,
          semester: course?.semester ?? null,
          quizTitle: game?.quizNumber ?? null,
          totalQuestions: questions.length,
          rows,                 // ✅ REQUIRED by your saveLiveReport signature
          stats: undefined,      // optional; function will compute
          finishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });

      })();
    };


    s.on("leaderboard:update", onLb);
    s.on("final_results", onFinal);

    return () => {
      s.off("leaderboard:update", onLb);
      s.off("final_results", onFinal);
    };
  }, [mode, pin, gameId, questions.length, s]);

  function next() {
    setStartAt(null);
    setNow(Date.now());
    autoRevealedRef.current = false;

    if (qIndex + 1 >= questions.length) {
      if (mode === "live" && pin) {
        s.emit("finish", { pin, payload: { total: questions.length } });
      }
      setStatus("final");
      return;
    }

    setQIndex((prev) => prev + 1);
    setStatus("question");

    if (mode === "live" && pin) {
      s.emit("next", { pin });
    }
  }

  /* ---------------- guards ---------------- */

  if (!q) {
    return (
      <div className="p-10">
        <p>No questions found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <LecturerLiveLayout
        courseId={courseId}
        gameId={gameId}
        game={game}
        course={course}
        pin={pinDisplay}
        status={status as any}
        q={q as any}
        qIndex={qIndex}
        totalQuestions={questions.length}
        startAt={startAt}
        durationSec={durationSec}
        joinedCount={mode === "preview" ? 0 : joinedCount}
        answeredCount={mode === "preview" ? 0 : answeredCount}
        counts={counts}
        ranked={mode === "preview" ? [] : ranked}
        onShowAnswer={() => showAnswer(false)}
        onNext={next}
        onDisconnectAfterReportClick={() => {
          if (mode !== "live") return;
          try {
            s.disconnect();
          } catch {}
        }}
      />
    </div>
  );
}
