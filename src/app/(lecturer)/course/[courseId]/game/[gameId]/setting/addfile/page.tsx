"use client";

import { useState } from "react";

export default function AddFileSetting() {
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      alert("Please upload an Excel (.xlsx) or CSV (.csv) file");
      return;
    }

    setFileName(file.name);

    // Later:
    // 1. Upload to AWS S3
    // 2. Parse with Lambda / backend
    // 3. Convert to questions
  }

  return (
    <>
      <h3 className="font-semibold mb-4">Add File</h3>

      <p className="text-sm text-gray-600 mb-6">
        Upload an Excel file to create quiz questions in bulk.
      </p>

      {/* Upload Box */}
      <label className="block border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-blue-50 transition">
        <input
          type="file"
          accept=".xlsx"
          hidden
          onChange={handleFileUpload}
        />

        <p className="font-medium text-blue-700">
          + Upload Excel File
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supported formats: .xlsx
        </p>
      </label>

      {fileName && (
        <p className="text-sm text-green-600 mt-3">
          Uploaded: {fileName}
        </p>
      )}

      {/* Template Preview */}
      <div className="mt-8">
        <p className="font-medium mb-2">Excel Template Format</p>

        <img
          src="/excel-template-preview.png"
          alt="Excel template example"
          className="border rounded-md shadow-sm max-w-full"
        />

        <p className="text-xs text-gray-500 mt-2">
          Columns must include: Question, Answer A–D, Correct Answer
        </p>
      </div>
    </>
  );
}
