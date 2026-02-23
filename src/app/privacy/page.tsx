export const metadata = {
  title: "Privacy Policy • GamoRax",
  description: "Privacy policy for GamoRax.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>

      <p className="mt-4 text-slate-700 dark:text-slate-300">
        GamoRax is a quiz application. This page explains what data we collect
        and how we use it.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Data we collect</h2>
      <ul className="mt-3 list-disc pl-6 text-slate-700 dark:text-slate-300">
        <li>Account/session information needed to run quiz sessions.</li>
        <li>Basic analytics (optional) to improve performance and usability.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">How we use data</h2>
      <ul className="mt-3 list-disc pl-6 text-slate-700 dark:text-slate-300">
        <li>To operate the service (create/join sessions, scoring, results).</li>
        <li>To prevent abuse and keep the service secure.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Contact</h2>
      <p className="mt-3 text-slate-700 dark:text-slate-300">
        Questions? Email{" "}
        <a className="underline" href="mailto:gamo404rax@gmail.com">
          gamo404rax@gmail.com
        </a>
        .
      </p>

      <p className="mt-10 text-sm text-slate-500 dark:text-slate-400">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
    </main>
  );
}