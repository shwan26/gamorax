"use client";

import { useEffect, useState } from "react";

export default function TimerBar({
  duration,
  startAt,
}: {
  duration: number;
  startAt: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(i);
  }, []);

  const elapsed = Math.min(duration, (now - startAt) / 1000);
  const percent = (elapsed / duration) * 100;

  return (
    <div className="h-2 bg-blue-200 rounded overflow-hidden mt-3">
      <div
        className="h-2 bg-blue-700 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
