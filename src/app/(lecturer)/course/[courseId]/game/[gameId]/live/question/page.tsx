"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import Navbar from "@/src/components/LecturerNavbar";
import LecturerLiveFlow from "@/src/components/live/LecturerLiveFlow";
import { supabase } from "@/src/lib/supabaseClient";

type CourseRow = {
  id: string;
  courseCode: string;
  courseName: string;
  section?: string | null;
  semester?: string | null;
};

type GameRow = {
  id: string;
  courseId: string;
  quizNumber: string;
  timer: { mode: "automatic" | "manual"; defaultTime: number };
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
};

export default function Page() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const router = useRouter();
  const sp = useSearchParams();

  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();
  const pin = (sp?.get("pin") ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [game, setGame] = useState<GameRow | null>(null);

  const valid = !!course && !!game && game.courseId === courseId;

  async function requireLecturerOrRedirect(nextPath: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }

    const { data: prof, error } = await supabase
      .from("my_profile_api")
      .select("role")
      .single();

    if (error || !prof || prof.role !== "lecturer") {
      await supabase.auth.signOut();
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }

    return true;
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseId || !gameId) return;

      // if no pin, go back to lobby
      if (!pin) {
        router.replace(`/course/${courseId}/game/${gameId}/live`);
        return;
      }

      setLoading(true);

      const ok = await requireLecturerOrRedirect(
        `/course/${courseId}/game/${gameId}/live/question?pin=${encodeURIComponent(pin)}`
      );
      if (!ok) return;

      const { data: c, error: cErr } = await supabase
        .from("courses_api")
        .select("id, courseCode, courseName, section, semester")
        .eq("id", courseId)
        .single();

      if (!alive) return;
      if (cErr) {
        alert("Load course error: " + cErr.message);
        setLoading(false);
        return;
      }

      const { data: g, error: gErr } = await supabase
        .from("games_api")
        .select("id, courseId, quizNumber, timer, shuffleQuestions, shuffleAnswers")
        .eq("id", gameId)
        .single();

      if (!alive) return;
      if (gErr) {
        alert("Load game error: " + gErr.message);
        setLoading(false);
        return;
      }

      setCourse(c as CourseRow);
      setGame(g as GameRow);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [courseId, gameId, pin, router]);

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      {loading ? (
        <div className="p-10 text-sm text-slate-600">Loading live…</div>
      ) : !courseId || !gameId ? (
        <div className="p-10">Missing route params.</div>
      ) : !valid || !course || !game ? (
        <div className="p-10">Invalid course/game.</div>
      ) : (
        <LecturerLiveFlow
          courseId={courseId}
          gameId={gameId}
          pin={pin}
          course={course}
          game={game}
        />
      )}
    </div>
  );
}
