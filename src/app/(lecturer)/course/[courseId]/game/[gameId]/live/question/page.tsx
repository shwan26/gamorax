"use client";

import Navbar from "@/src/components/LecturerNavbar";
import LecturerLiveFlow from "@/src/components/live/LecturerLiveFlow";

export default function Page() {
  return (
    <div className="min-h-screen app-surface app-bg">
      <Navbar />
      <LecturerLiveFlow />
    </div>
  );
}
