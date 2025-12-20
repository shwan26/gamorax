"use client";

// Update the import path to the correct location of Navbar
import Navbar from "../../../../components/Navbar";

export default function CreateGamePage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 px-4">
        <h2 className="text-2xl font-bold mb-8">Create new game</h2>

        <div className="w-full max-w-lg space-y-5">
          {["Course Code", "Course Name", "Section", "Semester"].map((label) => (
            <div key={label}>
              <label className="block mb-1 text-sm font-medium">{label}</label>
              <input
                className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
                placeholder={`Eg. ${
                  label === "Course Code"
                    ? "CSX3001"
                    : label === "Course Name"
                    ? "Fundamentals of Programming"
                    : label === "Section"
                    ? "541"
                    : "2/2025"
                }`}
              />
            </div>
          ))}

          <button className="w-full bg-[#3B8ED6] hover:bg-[#2F79B8] text-white py-2 rounded-md font-semibold shadow-md">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
