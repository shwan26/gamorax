export const metadata = {
  title: "About • GamoRax",
  description: "About GamoRax — a classroom-friendly quiz platform.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">About GamoRax</h1>
      <p className="mt-4 text-slate-700 dark:text-slate-300">
        GamoRax is a lightweight, classroom-friendly quiz platform designed for
        lecturers to host interactive sessions and for students to join quickly
        using a PIN.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Who runs this site</h2>
      <p className="mt-3 text-slate-700 dark:text-slate-300">
        This project is maintained by an independent developer as a learning /
        classroom tool.
      </p>

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
    </main>
  );
}