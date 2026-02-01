"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { StudentAccount } from "@/src/lib/studentAuthStorage";
import { getCurrentStudent, updateCurrentStudent } from "@/src/lib/studentAuthStorage";
import { botttsUrl, randomSeed } from "@/src/lib/dicebear";

export default function AvatarPicker() {
  const [me, setMe] = useState<StudentAccount | null>(null);
  const [seed, setSeed] = useState("student");

  useEffect(() => {
    let alive = true;

    (async () => {
      const s = await getCurrentStudent();
      if (!alive) return;

      setMe(s);
      setSeed((s?.avatarSeed || s?.email || "student").trim());
    })();

    return () => {
      alive = false;
    };
  }, []);

  const preview = useMemo(() => botttsUrl(seed, 160), [seed]);

  if (!me) return null;

  return (
    <div className="space-y-3">
      <div className="h-24 w-24 overflow-hidden rounded-full border bg-white">
        <Image src={preview} alt="avatar" width={96} height={96} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSeed(randomSeed())}
          className="rounded-md border px-4 py-2"
        >
          Random
        </button>

        <button
          type="button"
          onClick={async () => {
            const updated = await updateCurrentStudent({ avatarSeed: seed });
            setMe(updated);
          }}
          className="rounded-md bg-[#3B8ED6] px-4 py-2 text-white"
        >
          Save
        </button>
      </div>
    </div>
  );
}
