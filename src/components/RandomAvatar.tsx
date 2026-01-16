"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getCurrentStudent, updateCurrentStudent } from "@/src/lib/studentAuthStorage";
import { botttsUrl, randomSeed } from "@/src/lib/dicebear";

export default function AvatarPicker() {
  const [me, setMe] = useState<any>(null);
  const [seed, setSeed] = useState("");

  useEffect(() => {
    const s = getCurrentStudent();
    setMe(s);
    setSeed(s?.avatarSeed || s?.email || "student");
  }, []);

  const preview = useMemo(() => botttsUrl(seed, 160), [seed]);

  if (!me) return null;

  return (
    <div className="space-y-3">
      <div className="w-24 h-24 rounded-full overflow-hidden border bg-white">
        <Image src={preview} alt="avatar" width={96} height={96} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSeed(randomSeed())}
          className="px-4 py-2 rounded-md border"
        >
          Random
        </button>

        <button
          type="button"
          onClick={() => {
            updateCurrentStudent({ avatarSeed: seed });
            setMe(getCurrentStudent());
          }}
          className="px-4 py-2 rounded-md text-white bg-[#3B8ED6]"
        >
          Save
        </button>
      </div>
    </div>
  );
}
