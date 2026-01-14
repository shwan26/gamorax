"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function GameSubNavbar({ title }: { title: string }) {
  const params = useParams<{ courseId?: string; gameId?: string }>();
  const courseId = (params?.courseId ?? "").toString();
  const gameId = (params?.gameId ?? "").toString();

  const pathname = usePathname() ?? "";
  const base = `/course/${courseId}/game/${gameId}`;

  const isQuestion = pathname.startsWith(`${base}/question`);
  const isSetting = pathname.startsWith(`${base}/setting`);
  const isLive = pathname.startsWith(`${base}/live`);

  return (
    <div className="px-6 mt-3">
      <div className="flex items-center justify-between">
        <Link href={`/course/${courseId}`} className="text-sm">
          &larr; Back to Course
        </Link>

        <Link
          href={`${base}/question`}
          className={`font-medium text-sm ${
            isQuestion ? "text-[#034B6B]" : "text-gray-600 hover:underline"
          }`}
        >
          {title}
        </Link>

        <div className="flex gap-4">
          <Link
            href={`${base}/setting/general`}
            className={`px-6 py-2 rounded-md font-medium transition ${
              isSetting ? "bg-[#034B6B] text-white" : "border bg-white"
            }`}
          >
            Setting
          </Link>

          <Link
            href={`${base}/live`}
            className={`px-6 py-2 rounded-md font-medium transition ${
              isLive ? "bg-[#034B6B] text-white" : "border bg-white"
            }`}
          >
            Live
          </Link>
        </div>
      </div>
    </div>
  );
}
