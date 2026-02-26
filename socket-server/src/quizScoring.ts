export function calcPoints({
  isCorrect,
  maxTime,
  timeUsed,
  score,
}: {
  isCorrect: boolean;
  maxTime: number;
  timeUsed: number;
  score: number;
}): number {
  if (!isCorrect) return 0;

  const m = Math.max(0, Math.floor(maxTime));
  const t = Math.max(0, Math.floor(timeUsed));
  const s = Math.max(1, Math.floor(score));

  const timeLeft = Math.max(0, m - t);

  // ✅ your rule:
  return s * 100 + 10 * timeLeft;
}