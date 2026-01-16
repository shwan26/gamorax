// src/app/(student)/auth/login/page.tsx
import { Suspense } from "react";
import StudentLoginClient from "./StudentLoginClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StudentLoginClient />
    </Suspense>
  );
}
