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
    const i = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(i);
  }, []);

  const elapsed = Math.max(0, (now - startAt) / 1000);
  const remaining = Math.max(0, duration - elapsed);
  const percent = duration > 0 ? (remaining / duration) * 100 : 0;

  return (
    // ✅ centered + consistent width
    <div className="w-full">
      <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
        <div
          className="h-2 bg-blue-700 transition-[width] duration-100"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-600 text-center">
        {Math.ceil(remaining)}s
      </div>
    </div>
  );
}
