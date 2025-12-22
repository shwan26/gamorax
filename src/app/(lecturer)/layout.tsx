"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentLecturer } from "@/src/lib/fakeAuth";

export default function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentLecturer();
    if (!user) {
      router.push("/login");
    }
  }, []);

  return <>{children}</>;
}
