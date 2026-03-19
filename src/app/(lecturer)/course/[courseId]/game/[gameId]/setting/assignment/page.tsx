"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Link2, Trash2, Copy, Download, KeyRound } from "lucide-react";

import type { Question } from "@/src/lib/questionStorage";
import { getGameById, type Game } from "@/src/lib/gameStorage";
import { getQuestions } from "@/src/lib/questionStorage";

import {
  createAssignment,
  deleteAssignment,
  listAssignmentsByGame,
  type Assignment,
} from "@/src/lib/assignmentStorage";

import QRCode from "react-qr-code";

/* ---------------- helpers ---------------- */

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hashBuf));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromLocalDatetimeValue(v: string) {
  if (!v) return undefined;
  return new Date(v).toISOString();
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
    </span>
  );
}

function SkeletonCards() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/50"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/60" />
          <div className="mt-3 h-3 w-64 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/60" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}

/** Convert react-qr-code SVG -> PNG download */
async function downloadQrPng(svgId: string, filename: string) {
  const svg = document.getElementById(svgId) as SVGElement | null;
  if (!svg) {
    alert("QR not ready yet.");
    return;
  }

  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const imgSrc = `data:image/svg+xml;base64,${svg64}`;

  const img = new Image();
  img.onload = () => {
    const size = 1024; // nice crisp
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    // draw qr
    const pad = 60;
    ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  img.onerror = () => alert("QR download failed.");
  img.src = imgSrc;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied!");
  } catch {
    alert("Copy failed. You can manually select and copy.");
  }
}

/* ---------------- page ---------------- */

export default function AssignmentSettingPage() {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = String(params?.courseId ?? "");
  const gameId = String(params?.gameId ?? "");

  const [game, setGame] = useState<Game | null>(null);

  const [title, setTitle] = useState("Assignment");
  const [opensAt, setOpensAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [durationSec, setDurationSec] = useState(15 * 60);
  const [passcode, setPasscode] = useState("");

  const titleTouchedRef = useRef(false);

  // questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQs, setLoadingQs] = useState(true);

  // assignments list
  const [list, setList] = useState<Assignment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // create animation
  const [creating, setCreating] = useState(false);

  // show once after create
  const [createdPanel, setCreatedPanel] = useState<{
    link: string;
    publicToken: string;
    passcodePlain?: string;
  } | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);

  // load game
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!gameId) {
        setGame(null);
        return;
      }
      try {
        const g = await getGameById(gameId);
        if (!cancelled) setGame(g);
      } catch (e) {
        console.error(e);
        if (!cancelled) setGame(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  // auto-title
  useEffect(() => {
    if (!game?.quizNumber) return;
    if (titleTouchedRef.current) return;

    setTitle((prev) => {
      if (prev.trim() === "" || prev === "Assignment") return `Assignment — ${game.quizNumber}`;
      return prev;
    });
  }, [game?.quizNumber]);

  // load questions
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!gameId) {
        setQuestions([]);
        setLoadingQs(false);
        return;
      }

      try {
        setLoadingQs(true);
        const qs = await getQuestions(gameId);
        if (!cancelled) setQuestions(qs);
      } catch (e) {
        console.error(e);
        if (!cancelled) setQuestions([]);
      } finally {
        if (!cancelled) setLoadingQs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  async function reloadList() {
    if (!gameId) return;
    setLoadingList(true);
    try {
      const rows = await listAssignmentsByGame(gameId);
      setList(rows);
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void reloadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  function buildLink(a: Assignment) {
    return `${origin}/assignment/${a.publicToken}`;
  }

  async function handleCreate() {
    if (!courseId || !gameId) return;

    if (!loadingQs && questions.length === 0) {
      alert("This game has no questions yet.");
      return;
    }

    const raw = passcode.trim();
    const passcodeHash = raw ? await sha256Hex(raw) : undefined;

    setCreating(true);
    try {
      // IMPORTANT: createAssignment should return the created row (with publicToken)
      const created = await createAssignment({
        courseId,
        gameId,
        title: title.trim() || "Assignment",
        opensAt: fromLocalDatetimeValue(opensAt),
        dueAt: fromLocalDatetimeValue(dueAt),
        durationSec: Math.max(30, Math.min(6 * 60 * 60, durationSec)),
        passcodeHash,
      });

      setPasscode("");

      await reloadList();

      const link = `${origin}/assignment/${created.publicToken}`;
      setCreatedPanel({
        link,
        publicToken: created.publicToken,
        passcodePlain: raw || undefined,
      });
      setShowPasscode(false);

      alert("Assignment created.");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAssignment(id);
      await reloadList();
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Delete failed");
    }
  }

  if (!gameId) return <div>Missing gameId</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
          Assignment
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Create a timed assignment with open/expire dates and share the link + QR code to students.
        </p>
      </div>

      {creating ? (
        <div className="rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-sm font-bold text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200">
          Creating assignment and generating link <Dots />
        </div>
      ) : null}

      {/* ✅ Share panel (same QR card style as Live lobby) */}
      {createdPanel ? (
        <section
          className="
            relative overflow-hidden rounded-3xl
            border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur
            dark:border-slate-800/70 dark:bg-slate-950/45
          "
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--dot-color) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#00D4FF]/14 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-[#2563EB]/10 blur-3xl dark:bg-[#3B82F6]/18" />

          <div className="relative grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            {/* left qr */}
            <div
              className="
                rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm
                dark:border-slate-800/70 dark:bg-slate-950/55
                flex items-center justify-center
              "
            >
              <div className="bg-white p-2 rounded-2xl">
                <QRCode id={`qr-created-${createdPanel.publicToken}`} value={createdPanel.link} size={260} />
              </div>
            </div>

            {/* right details */}
            <div className="min-w-0 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
                  <Link2 className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Share this assignment link
                  </p>
                  <p className="mt-1 break-all text-sm font-mono text-slate-600 dark:text-slate-300">
                    {createdPanel.link.replace(/^https?:\/\//, "")}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyText(createdPanel.link)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35"
                    >
                      <Copy className="h-4 w-4" /> Copy link
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void downloadQrPng(
                          `qr-created-${createdPanel.publicToken}`,
                          `assignment-${createdPanel.publicToken}.png`
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35"
                    >
                      <Download className="h-4 w-4" /> Download QR
                    </button>
                  </div>
                </div>
              </div>

              {/* passcode show once */}
              {createdPanel.passcodePlain ? (
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
                    <KeyRound className="h-5 w-5 text-slate-800 dark:text-[#A7F3FF]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      Passcode (save now — cannot be recovered)
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasscode((v) => !v)}
                        className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35"
                      >
                        {showPasscode ? "Hide" : "Show"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void copyText(createdPanel.passcodePlain!)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35"
                      >
                        <Copy className="h-4 w-4" /> Copy passcode
                      </button>
                    </div>

                    <div className="mt-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-mono text-slate-900 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-100">
                      {showPasscode ? createdPanel.passcodePlain : "••••••"}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No passcode set for this assignment.
                </p>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tip: download the QR and paste it into slides/LINE/Teams.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* create form */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/50">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => {
                titleTouchedRef.current = true;
                setTitle(e.target.value);
              }}
              disabled={creating}
              className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm disabled:opacity-60 dark:border-slate-800/70 dark:bg-slate-950/35"
            />
            {game?.quizNumber ? (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Linked to game: <span className="font-semibold">{game.quizNumber}</span>
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Passcode (optional)
            </label>
            <input
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="e.g. 1234"
              disabled={creating}
              className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm disabled:opacity-60 dark:border-slate-800/70 dark:bg-slate-950/35"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Students must enter this passcode before starting.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Opens at (optional)
            </label>
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              disabled={creating}
              className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm disabled:opacity-60 dark:border-slate-800/70 dark:bg-slate-950/35"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Due at (optional)
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={creating}
              className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm disabled:opacity-60 dark:border-slate-800/70 dark:bg-slate-950/35"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Duration (seconds)
            </label>
            <input
              type="number"
              min={30}
              max={6 * 60 * 60}
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              disabled={creating}
              className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm disabled:opacity-60 dark:border-slate-800/70 dark:bg-slate-950/35"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={loadingQs || creating}
              className="
                w-full rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5
                text-sm font-bold shadow-sm hover:bg-white
                disabled:cursor-not-allowed disabled:opacity-60
                dark:border-slate-800/70 dark:bg-slate-950/35 dark:hover:bg-slate-950/55
                inline-flex items-center justify-center gap-2
              "
            >
              {loadingQs ? (
                <>
                  Loading questions <Dots />
                </>
              ) : creating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent dark:border-slate-500 dark:border-t-transparent" />
                  Creating <Dots />
                </>
              ) : (
                "Create assignment"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* existing list */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
          Existing
        </h3>

        {loadingList || creating ? (
          <SkeletonCards />
        ) : list.length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            No assignments yet.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((a) => {
              const link = buildLink(a);
              const qrId = `qr-existing-${a.publicToken}`;

              return (
                <div
                  key={a.id}
                  className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* left info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                        {a.title}
                      </div>

                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Duration: {a.durationSec}s
                        {a.opensAt ? ` • Opens: ${new Date(a.opensAt).toLocaleString()}` : ""}
                        {a.dueAt ? ` • Due: ${new Date(a.dueAt).toLocaleString()}` : ""}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-xs dark:border-slate-800/70 dark:bg-slate-950/40">
                          <Link2 className="h-4 w-4" />
                          <span className="break-all sm:truncate sm:max-w-[520px]">{link}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => void copyText(link)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35"
                        >
                          <Copy className="h-4 w-4" /> Copy link
                        </button>

                        <button
                          type="button"
                          onClick={() => void downloadQrPng(qrId, `assignment-${a.publicToken}.png`)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35"
                        >
                          <Download className="h-4 w-4" /> Download QR
                        </button>
                      </div>
                    </div>

                    {/* right qr + delete */}
                    <div className="flex items-start gap-3">
                      <div
                        className="
                          rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm
                          dark:border-slate-800/70 dark:bg-slate-950/40
                        "
                      >
                        <div className="bg-white p-2 rounded-xl">
                          <QRCode id={qrId} value={link} size={140} />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDelete(a.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200/80 bg-white/70 text-red-600 shadow-sm hover:bg-white dark:border-red-900/40 dark:bg-slate-950/40 dark:text-red-400"
                        title="Delete"
                        disabled={creating}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}