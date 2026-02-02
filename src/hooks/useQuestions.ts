// src/hooks/useQuestions.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { getQuestions, type Question } from "@/src/lib/questionStorage";

export function useQuestions(gameId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!gameId) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const qs = await getQuestions(gameId);
      setQuestions(qs ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await refresh();
    })();

    return () => {
      alive = false;
    };
  }, [refresh]);

  return { questions, setQuestions, loading, error, refresh };
}
