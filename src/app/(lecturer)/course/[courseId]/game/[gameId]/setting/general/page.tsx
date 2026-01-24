"use client";

import { useParams, useRouter } from "next/navigation";
import {
  getGameById,
  updateGame,
  deleteGame,
  type Game,
} from "@/src/lib/gameStorage";
import { useEffect, useRef, useState } from "react";
import GradientButton from "@/src/components/GradientButton";
import {
  Settings,
  Shuffle,
  Trash2,
  Hash,
  Pencil,
  Check,
  X,
} from "lucide-react";

/* ------------------------------ UI bits ------------------------------ */

function StatusPill({ text }: { text: string }) {
  return (
    <span
      className="
        inline-flex items-center rounded-full border border-slate-200/70
        bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600
        dark:border-slate-800/70 dark:bg-slate-950/50 dark:text-slate-300
      "
    >
      {text}
    </span>
  );
}

function TitleField({
  value,
  onChange,
  disabled,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={[
          "w-full rounded-2xl border px-3 py-2.5 pl-9 shadow-sm outline-none backdrop-blur",
          "border-slate-200/80 bg-white/80 text-slate-900 placeholder:text-slate-400",
          "focus:ring-2 focus:ring-[#00D4FF]/40 focus:border-transparent",
          "dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-50 dark:placeholder:text-slate-500",
          disabled
            ? "opacity-80 cursor-not-allowed"
            : "transition-shadow",
        ].join(" ")}
      />
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
  saving,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  saving?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "w-full text-left",
        "group flex items-start justify-between gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur",
        "transition-all duration-200",
        checked
          ? "border-[#00D4FF]/40 bg-white/85 dark:bg-slate-950/65"
          : "border-slate-200/70 bg-white/70 hover:bg-white/85 dark:border-slate-800/70 dark:bg-slate-950/55 dark:hover:bg-slate-950/70",
        "focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40",
        "active:scale-[0.995]",
      ].join(" ")}
      aria-pressed={checked}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </p>
          {saving ? <StatusPill text="Saving..." /> : checked ? <StatusPill text="On" /> : <StatusPill text="Off" />}
        </div>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{desc}</p>
      </div>

      {/* Animated switch */}
      <span className="shrink-0 pt-0.5">
        <span
          className={[
            "relative inline-flex h-6 w-11 items-center rounded-full",
            "transition-colors duration-200",
            checked ? "bg-[#00D4FF]" : "bg-slate-200 dark:bg-slate-800",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-5 w-5 rounded-full bg-white shadow",
              "transition-transform duration-200 ease-out",
              checked ? "translate-x-5" : "translate-x-0.5",
            ].join(" ")}
          />
        </span>
      </span>
    </button>
  );
}

/* ------------------------------ page ------------------------------ */

export default function GeneralSettingPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();
  const router = useRouter();

  const [game, setGame] = useState<Game | null>(null);

  // Name edit mode (save name ONLY)
  const [editingName, setEditingName] = useState(false);
  const [quizNumberDraft, setQuizNumberDraft] = useState("");

  // Toggles (save immediately on click)
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(false);

  // UI feedback
  const [savingToggleKey, setSavingToggleKey] = useState<"q" | "a" | null>(null);
  const [nameSavedPing, setNameSavedPing] = useState(false);
  const pingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!gameId) return;
    const g = getGameById(gameId);
    setGame(g);

    setQuizNumberDraft(g?.quizNumber ?? "");
    setShuffleQuestions(!!g?.shuffleQuestions);
    setShuffleAnswers(!!g?.shuffleAnswers);
  }, [gameId]);

  useEffect(() => {
    return () => {
      if (pingTimer.current) window.clearTimeout(pingTimer.current);
    };
  }, []);

  if (!gameId) return <div className="p-6">Missing game id in URL.</div>;
  if (!game) return <div className="p-6">Game not found.</div>;

  function pingNameSaved() {
    setNameSavedPing(true);
    if (pingTimer.current) window.clearTimeout(pingTimer.current);
    pingTimer.current = window.setTimeout(() => setNameSavedPing(false), 1200);
  }

  function saveName() {
    updateGame(gameId, { quizNumber: quizNumberDraft.trim() || "Untitled Game" });

    // keep local state in sync
    const nextName = quizNumberDraft.trim() || "Untitled Game";
    setGame((prev) => (prev ? { ...prev, quizNumber: nextName } : prev));
    setQuizNumberDraft(nextName);

    setEditingName(false);
    pingNameSaved();
  }

  function cancelNameEdit() {
    setQuizNumberDraft(game?.quizNumber ?? "");
    setEditingName(false);
  }

  function saveToggle(patch: Partial<Game>, key: "q" | "a") {
    setSavingToggleKey(key);

    updateGame(gameId, patch);
    setGame((prev) => (prev ? { ...prev, ...patch } : prev));

    // instant save, so just clear soon
    window.setTimeout(() => setSavingToggleKey(null), 350);
  }

  function handleDelete() {
    if (!confirm("This will delete the entire quiz and all data. Continue?")) return;
    deleteGame(gameId);
    router.push(`/course/${courseId}`);
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start gap-3">
        <div
          className="
            rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm
            dark:border-slate-800/70 dark:bg-slate-950/60
          "
        >
          <Settings className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            General
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Edit the quiz title manually. Toggles save instantly.
          </p>
        </div>
      </div>

      {/* Name card (edit + save name only) */}
      <div
        className="
          rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/55
        "
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Quiz Number / Title
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              This appears on the course page and live session screens.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {nameSavedPing ? <StatusPill text="Saved" /> : null}

            {!editingName ? (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="
                  inline-flex items-center gap-2 rounded-2xl border border-slate-200/80
                  bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm
                  hover:bg-white transition-colors
                  dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80
                  focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
                "
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={cancelNameEdit}
                  className="
                    inline-flex items-center gap-2 rounded-2xl border border-slate-200/80
                    bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm
                    hover:bg-white transition-colors
                    dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-950/80
                    focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/40
                  "
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveName}
                  className="
                    inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-white
                    bg-gradient-to-r from-[#00D4FF] via-[#38BDF8] to-[#2563EB]
                    shadow-[0_10px_25px_rgba(37,99,235,0.18)]
                    hover:opacity-95 active:scale-[0.99] transition
                    focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/50
                  "
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4">
          <TitleField
            value={quizNumberDraft}
            onChange={setQuizNumberDraft}
            disabled={!editingName}
            autoFocus={editingName}
            placeholder="e.g. Game 1"
          />
        </div>
      </div>

      {/* Shuffle card (toggles save immediately) */}
      <div
        className="
          rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur
          dark:border-slate-800/70 dark:bg-slate-950/55
        "
      >
        <div className="flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Shuffle in Live Mode
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <ToggleRow
            title="Shuffle Questions"
            desc="Randomize question order during Live sessions."
            checked={shuffleQuestions}
            saving={savingToggleKey === "q"}
            onChange={(v) => {
              setShuffleQuestions(v);
              saveToggle({ shuffleQuestions: v }, "q"); // ✅ save immediately
            }}
          />

          <ToggleRow
            title="Shuffle Answers"
            desc="Randomize A/B/C/D order during Live sessions."
            checked={shuffleAnswers}
            saving={savingToggleKey === "a"}
            onChange={(v) => {
              setShuffleAnswers(v);
              saveToggle({ shuffleAnswers: v }, "a"); // ✅ save immediately
            }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          These apply only during Live sessions. Your editor order stays the same.
        </p>
      </div>

      {/* Delete */}
      <div className="pt-1">
        <GradientButton
          variant="danger"
          onClick={handleDelete}
          iconLeft={<Trash2 className="h-4 w-4" />}
        >
          Delete Entire Quiz
        </GradientButton>
      </div>
    </div>
  );
}
