"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";

export default function CreateGamePage() {
  const router = useRouter();
  const params = useParams<{ courseId?: string }>();
  const courseId = (params?.courseId ?? "").toString();

  const [quizNumber, setQuizNumber] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!courseId) return;

    const title = quizNumber.trim();
    if (!title) {
      alert("Please fill quiz number/title.");
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.replace(
        `/login?next=${encodeURIComponent(`/course/${courseId}/game/create`)}`
      );
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("games_api")
        .insert({
          courseId,
          quizNumber: title,
          timer: { mode: "automatic", defaultTime: 60 },
          shuffleQuestions: false,
          shuffleAnswers: false,
        })
        .select("id")
        .single();

      if (error) {
        alert("Create game failed: " + error.message);
        return;
      }

      router.push(`/course/${courseId}/game/${data.id}/question`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />

      <main className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-14">
        <div className="w-full max-w-md">
          <Link
            href={`/course/${courseId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>

          <div
            className="
              mt-4 overflow-hidden rounded-3xl p-[1px]
              bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
              shadow-[0_12px_30px_rgba(37,99,235,0.10)]
              dark:shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_18px_50px_rgba(56,189,248,0.10)]
            "
          >
            <div
              className="
                relative rounded-[23px] bg-white p-6 ring-1 ring-slate-200/70
                dark:bg-[#071A33] dark:ring-slate-700/60
                sm:p-7
              "
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />

              <div className="relative flex items-start gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-700/70 dark:bg-[#0B2447]">
                  <Gamepad2 className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    Create new game
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Give your game a title. You can add questions next.
                  </p>
                </div>
              </div>

              <div className="relative mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Quiz Number / Title
                  </label>

                  <input
                    value={quizNumber}
                    onChange={(e) => setQuizNumber(e.target.value)}
                    placeholder="Eg. Game 1"
                    className="
                      w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm
                      shadow-sm outline-none
                      focus:ring-2 focus:ring-[#00D4FF]/50 focus:border-transparent
                      dark:border-slate-800/70 dark:bg-slate-950/35 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                    "
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="
                    w-full rounded-xl py-3 text-sm font-semibold text-white
                    bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                    shadow-[0_10px_25px_rgba(37,99,235,0.18)]
                    hover:opacity-95 active:scale-[0.99] transition
                    focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
                    disabled:opacity-60 disabled:cursor-not-allowed
                  "
                >
                  {saving ? "Creating..." : "Create"}
                </button>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Default settings: automatic timer (60s), no shuffle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
