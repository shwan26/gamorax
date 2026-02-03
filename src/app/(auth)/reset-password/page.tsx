// src/app/(auth)/reset-password/page.tsx
import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function Page() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordClient />
    </Suspense>
  );
}

function ResetPasswordSkeleton() {
  return (
    <div className="min-h-screen app-surface app-bg">
      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          <div className="mt-4 overflow-hidden rounded-3xl p-[1px] bg-slate-200/70 dark:bg-slate-800/70 animate-pulse">
            <div className="rounded-3xl p-6 sm:p-7 bg-white/70 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/70">
              <div className="h-6 w-56 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="mt-2 h-4 w-72 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="mt-6 space-y-3">
                <div className="h-11 w-full rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
                <div className="h-11 w-full rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
                <div className="h-11 w-full rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
