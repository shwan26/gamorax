// src/lib/quizScoring.ts
export function calcPoints(params: {
  isCorrect: boolean;
  maxTime: number;   // seconds
  timeUsed: number;  // seconds
}) {
  const maxTime = Math.max(0, Math.floor(params.maxTime || 0));
  const timeUsed = Math.max(0, Math.floor(params.timeUsed || 0));

  if (!params.isCorrect) return 0;

  const timeLeft = Math.max(0, maxTime - timeUsed);

  // base = maxTime, bonus = timeLeft
  return (maxTime + timeLeft) * 10;
}
