export const metadata = {
  title: "Contact • GamoRax",
  description: "How to contact the GamoRax maintainer.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p className="mt-4 text-slate-700 dark:text-slate-300">
        If you need help or want to report an issue, contact us:
      </p>

      <ul className="mt-6 space-y-2 text-slate-700 dark:text-slate-300">
        <li>
          Email:{" "}
          <a className="underline" href="mailto:you@example.com">
            gamo404rax@gmail.com
          </a>
        </li>
        <li>Project: GamoRax</li>
      </ul>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        Please include screenshots and your device/browser if reporting a bug.
      </p>
    </main>
  );
}