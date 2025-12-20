"use client";

import Navbar from "../../../../../components/Navbar";

export default function QuestionEditor() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* TAB BAR */}
      <div className="flex gap-6 px-6 mt-4">
        <button className="text-white bg-[#034B6B] px-6 py-2 rounded-md">Gam 1</button>
        <button className="bg-white px-6 py-2 rounded-md border">Setting</button>
        <button className="bg-white px-6 py-2 rounded-md border">Live</button>
      </div>

      <div className="flex mt-6">
        {/* LEFT PANEL */}
        <div className="w-40 flex flex-col gap-4 px-6">
          <button className="bg-[#A5D4F3] text-xl rounded-md py-6">1</button>
          <button className="bg-[#A5D4F3] text-xl rounded-md py-6">＋</button>
        </div>

        {/* MAIN QUESTION EDITOR */}
        <div className="flex-1 px-6">
          <input
            placeholder="Type Question Here..."
            className="w-full border rounded-md p-3 text-center text-lg"
          />

          {/* ANSWER BLOCK */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-gray-300 flex items-center justify-center font-bold">
                  {String.fromCharCode(64 + n)}
                </div>
                <input className="flex-1 border p-2 rounded-md" placeholder={`Answer ${n}`} />
                <input type="checkbox" />
              </div>
            ))}
          </div>

          <button className="bg-[#A5D4F3] w-60 mx-auto mt-10 block py-2 rounded-md font-bold">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
