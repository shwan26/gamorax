"use client";

export default function AddFileSetting() {
  return (
    <>
      <h3 className="font-semibold mb-4">Add File</h3>

      <button className="border px-4 py-2 rounded-md">
        + Upload File
      </button>

      <p className="text-sm text-gray-500 mt-3">
        Files will be stored in cloud storage (AWS S3).
      </p>
    </>
  );
}
