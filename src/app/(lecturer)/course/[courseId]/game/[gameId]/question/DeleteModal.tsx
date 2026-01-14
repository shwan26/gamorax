"use client";

export default function DeleteModal({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md p-6 w-80 text-center shadow-lg">
        <h3 className="font-semibold mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

        <div className="flex justify-center gap-4">
          <button onClick={onCancel} className="px-4 py-2 border rounded-md">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-md">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
