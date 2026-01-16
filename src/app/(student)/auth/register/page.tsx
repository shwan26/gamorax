// src/app/(student)/auth/register/page.tsx
import { Suspense } from "react";
import StudentRegisterClient from "./StudentRegisterClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StudentRegisterClient />
    </Suspense>
  );
}
