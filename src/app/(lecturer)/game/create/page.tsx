"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/src/components/LecturerNavbar";
import { saveGame } from "@/src/lib/gameStorage";

export default function CreateGamePage() {

  const router = useRouter();
  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    section: "",
    semester: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function handleCreate() {
    if (
      !form.courseCode ||
      !form.courseName ||
      !form.section ||
      !form.semester
    ) {
      alert("Please fill in all fields.");
      return;
    }

    saveGame({
      id: crypto.randomUUID(),
      ...form,
    });
    
    router.push("/dashboard");
  }
    

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />

      <div className="flex flex-col items-center mt-10 px-4">
        <h2 className="text-2xl font-bold mb-8">Create new game</h2>

        <div className="w-full max-w-lg space-y-5">
          {[
            { label: "Course Code", name: "courseCode", placeholder: "CSX3001" },
            {
              label: "Course Name",
              name: "courseName",
              placeholder: "Fundamentals of Programming",
            },
            { label: "Section", name: "section", placeholder: "541" },
            { label: "Semester", name: "semester", placeholder: "2/2025" },
          ].map(({ label, name, placeholder }) => (
            <div key={name}>
              <label className="block mb-1 text-sm font-medium">{label}</label>
              <input
                name={name}
                onChange={handleChange}
                placeholder={`Eg. ${placeholder}`}
                className="w-full border rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}

          <button
            onClick={handleCreate}
            className="w-full bg-[#3B8ED6] hover:bg-[#2F79B8] text-white py-2 rounded-md font-semibold shadow-md"
          >  Create
          </button>
        </div>
      </div>
    </div>
  );
}
