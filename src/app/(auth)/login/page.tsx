// src/app/(auth)/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function Page() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginClient />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen app-surface app-bg">
      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-12 pt-8 sm:pt-12 md:pt-16">
        <div className="w-full max-w-md">
          <div className="mt-4 overflow-hidden rounded-3xl p-[1px] bg-slate-200/70 dark:bg-slate-800/70 animate-pulse">
            <div className="rounded-3xl p-6 sm:p-7 bg-white/70 dark:bg-slate-950/50">
              <div className="h-6 w-40 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="mt-2 h-4 w-64 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
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
