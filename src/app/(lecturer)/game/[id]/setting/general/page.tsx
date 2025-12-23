"use client";

import { useParams, useRouter } from "next/navigation";
import { getGameById, updateGame, deleteGame } from "@/src/lib/gameStorage";
import { useState } from "react";

export default function GeneralSettingPage() {
  const params = useParams<{ id?: string }>();
  const id = (params?.id ?? "").toString();

  const router = useRouter();
  const game = getGameById(id);

  const [form, setForm] = useState({
    quizNumber: game?.quizNumber || "",
    courseCode: game?.courseCode || "",
    courseName: game?.courseName || "",
    semester: game?.semester || "",
  });

  if (!game) return null;

  function handleSave() {
    updateGame(id, form);
    alert("General settings updated");
  }

  function handleDelete() {
    if (!confirm("This will delete the entire quiz and all data. Continue?")) return;
    deleteGame(id);
    router.push("/dashboard");
  }

  return (
    <>
      <h3 className="font-semibold mb-6">General</h3>

      {Object.entries(form).map(([key, value]) => (
        <div key={key} className="mb-4">
          <label className="block text-sm font-medium mb-1">
            {key.replace(/([A-Z])/g, " $1")}
          </label>
          <input
            value={value}
            onChange={(e) =>
              setForm({ ...form, [key]: e.target.value })
            }
            className="border rounded-md px-3 py-2 w-full"
          />
        </div>
      ))}

      <button
        onClick={handleSave}
        className="bg-[#6AB6E9] px-6 py-2 rounded-md"
      >
        Save
      </button>

      <br /><br />

      <button
        onClick={handleDelete}
        className="text-red-600 font-medium"
      >
        Delete Entire Quiz
      </button>
    </>
  );
}
