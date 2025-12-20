"use client";

import Navbar from "../../../../../../components/Navbar";

export default function AddFileSetting() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="flex px-6 mt-4">
        {/* LEFT MENU */}
        <div className="w-40 flex flex-col gap-6 text-lg">
          <a className="font-bold text-blue-700">Add File</a>
          <a>Timer</a>
          <a>Report</a>
        </div>

        {/* Content */}
        <div className="flex-1 px-10">
          <button className="border px-4 py-2 rounded-md">+ Upload File</button>
        </div>
      </div>
    </div>
  );
}
