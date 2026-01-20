// src/lib/quizScoring.ts
export function calcPoints(params) {
    const maxTime = Math.max(0, Math.floor(params.maxTime || 0));
    const timeUsed = Math.max(0, Math.floor(params.timeUsed || 0));
    if (!params.isCorrect)
        return 0;
    const timeLeft = Math.max(0, maxTime - timeUsed);
    return timeLeft * 10;
}
//# sourceMappingURL=quizScoring.js.map