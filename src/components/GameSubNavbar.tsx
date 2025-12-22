"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function GameSubNavbar({ title }: { title: string }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  const tabs = [
    { label: "Setting", href: `/game/${id}/setting` },
    { label: "Live", href: `/game/${id}/live` },
  ];

  const isQuestionPage = pathname.startsWith(`/game/${id}/question`);

  return (
    <div className="px-6 mt-3">
      <div className="flex items-center justify-between">
        {/* CLICKABLE TITLE (acts as Gam) */}
        <Link
          href={`/game/${id}/question`}
          className={`font-medium text-sm
            ${
              isQuestionPage
                ? "text-[#034B6B]"
                : "text-gray-600 hover:underline"
            }`}
        >
          {title}
        </Link>

        {/* TABS */}
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`px-6 py-2 rounded-md font-medium transition
                  ${
                    active
                      ? "bg-[#034B6B] text-white"
                      : "border bg-white"
                  }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
