"use client";

import Navbar from "../../../../../../components/Navbar";

export default function TimerSetting() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="flex px-6 mt-4">
        <div className="w-40 flex flex-col gap-6 text-lg">
          <a>Add File</a>
          <a className="font-bold text-blue-700">Timer</a>
          <a>Report</a>
        </div>

        <div className="flex-1 px-10">
          <div className="flex items-center gap-3">
            <input type="radio" />
            <span className="font-semibold text-blue-700">Automatic</span>
            <input type="number" className="border px-2 py-1 w-20" defaultValue={60} />
            <span>Seconds</span>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <input type="radio" />
            <span className="font-semibold text-blue-700">Manual</span>
          </div>
        </div>
      </div>
    </div>
  );
}
