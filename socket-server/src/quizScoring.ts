export function calcPoints({
  isCorrect,
  maxTime,
  timeUsed
}: {
  isCorrect: boolean;
  maxTime: number;
  timeUsed: number;
}): number {
  if (!isCorrect) return 0;

  const m = Math.max(0, Math.floor(maxTime));
  const t = Math.max(0, Math.floor(timeUsed));

  // simple: 100 base + (remaining time)
  const bonus = Math.max(0, m - t);
  return 100 + bonus;
}
