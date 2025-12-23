"use client";

import { useRouter, useParams } from "next/navigation";

export default function FinalBoard({
  ranked,
  total,
}: {
  ranked: Array<{
    studentId: string;
    name: string;
    correct: number;
    points: number;
  }>;
  total: number;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
const id = (params?.id ?? "").toString();


  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);

  return (
    <>
      <h2 className="text-xl font-bold text-center mb-8">
        Final Result
      </h2>

      {/* PODIUM */}
      <div className="flex justify-center gap-10 mb-12">
        {podium.map((p, i) => (
          <div key={p.studentId} className="text-center">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-xl">
              {p.name?.charAt(0) || "S"}
            </div>

            <div className="text-xs font-semibold">{p.studentId}</div>
            <div className="text-xs text-gray-600 mb-2">
              {p.correct}/{total}
            </div>

            {/* Podium block */}
            <div
              className={`w-28 ${
                i === 1 ? "h-52" : "h-40"
              } bg-blue-600 text-white flex items-center justify-center font-bold`}
            >
              {i === 1 ? "1" : i === 0 ? "2" : "3"}
            </div>
          </div>
        ))}
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end px-10">
        <button
          onClick={() => router.push(`/game/${id}/setting/report`)}
          className="bg-[#3B8ED6] text-white px-10 py-3 rounded-full text-lg hover:bg-[#2f79b8]"
        >
          View Report
        </button>
      </div>
    </>
  );
}
