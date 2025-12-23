"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function GameSubNavbar({ title }: { title: string }) {
  const params = useParams<{ id?: string }>();
const id = (params?.id ?? "").toString();

  const pathname = usePathname() ?? "";

  const isQuestion = pathname.startsWith(`/game/${id}/question`);
  const isSetting = pathname.startsWith(`/game/${id}/setting`);
  const isLive = pathname.startsWith(`/game/${id}/live`);

  return (
    <div className="px-6 mt-3">
      <div className="flex items-center justify-between">
        {/* TITLE (acts as Gam) */}
        <Link
          href={`/game/${id}/question`}
          className={`font-medium text-sm ${
            isQuestion
              ? "text-[#034B6B]"
              : "text-gray-600 hover:underline"
          }`}
        >
          {title}
        </Link>

        {/* TABS */}
        <div className="flex gap-4">
          <Link
            href={`/game/${id}/setting/general`}
            className={`px-6 py-2 rounded-md font-medium transition ${
              isSetting
                ? "bg-[#034B6B] text-white"
                : "border bg-white"
            }`}
          >
            Setting
          </Link>

          <Link
            href={`/game/${id}/live`}
            className={`px-6 py-2 rounded-md font-medium transition ${
              isLive
                ? "bg-[#034B6B] text-white"
                : "border bg-white"
            }`}
          >
            Live
          </Link>
        </div>
      </div>
    </div>
  );
}
