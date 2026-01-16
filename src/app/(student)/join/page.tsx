"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import GradientButton from "@/src/components/GradientButton";
import { getCurrentStudent } from "@/src/lib/studentAuthStorage";
import { botttsUrl } from "@/src/lib/dicebear";

export default function StudentJoin() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState("");

  const [me, setMe] = useState<ReturnType<typeof getCurrentStudent>>(null);

  useEffect(() => {
    setMounted(true);
    setMe(getCurrentStudent());
  }, []);

  const avatarUrl = useMemo(() => {
    const seed = me?.avatarSeed || me?.email || "student";
    return botttsUrl(seed, 96);
  }, [me?.avatarSeed, me?.email]);

  const handleJoin = () => {
    const pin = code.trim();
    if (!pin) return;

    const cur = getCurrentStudent();
    if (!cur) {
      router.push(`/auth/login?next=${encodeURIComponent(`/join/${pin}`)}`);
      return;
    }

    router.push(`/join/${encodeURIComponent(pin)}`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-12 md:mt-20 px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">
          Join GamoRaX
        </h2>

        {/* Avatar preview (shows last saved avatarSeed) */}
        {me ? (
          <div className="mt-4 flex items-center gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm">
            <div className="w-11 h-11 rounded-full overflow-hidden border bg-white">
              {/* Use <img> to avoid next/image host config problems */}
              <img src={avatarUrl} alt="avatar" className="w-11 h-11" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-gray-800">{me.name}</div>
              <div className="text-xs text-gray-600">{me.email}</div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-xs text-gray-600">
            Not logged in — you’ll be asked to login after entering PIN.
          </div>
        )}

        <div className="w-full max-w-sm space-y-4 mt-6">
          <div>
            <label className="block mb-1 text-sm font-medium">Enter Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400 text-sm md:text-base"
            />
          </div>

          <GradientButton onClick={handleJoin} type="button">
            Join
          </GradientButton>

          <div className="text-center text-xs md:text-sm text-gray-600">
            <button
              onClick={() => router.push("/auth/login")}
              className="hover:underline"
              type="button"
            >
              Login as Student
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
