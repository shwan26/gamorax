"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function Page() {
  const [log, setLog] = useState("");
  const [pin, setPin] = useState("");

  function setPinClean(raw: string) {
    // keep digits only + max 6
    const cleaned = String(raw || "").replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
  }

  async function studentLogin() {
    setLog("Logging in as student...");
    const { error } = await supabase.auth.signInWithPassword({
      email: "u6530181@au.edu",
      password: "Test1234!",
    });
    if (error) return setLog("❌ Login error: " + error.message);
    setLog("✅ Student login OK");
  }

  async function submitAnswerB() {
    if (pin.length !== 6) {
      return setLog(`❌ Enter 6-digit PIN first. (Now: "${pin}" length=${pin.length})`);
    }

    setLog("Submitting answer via RPC (B=1) ...");

    const { data, error } = await supabase.rpc("submit_live_answer_by_pin", {
      p_pin: pin,
      p_answer_index: 1, // B
      p_time_used: 5,
    });

    if (error) return setLog("❌ Submit error: " + error.message);

    setLog("✅ Answer submitted (or already submitted):\n" + JSON.stringify(data, null, 2));
  }

  async function logout() {
    await supabase.auth.signOut();
    setLog("Logged out ✅");
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>DB Student Test (Answer via RPC)</h1>

      <div style={{ marginBottom: 8 }}>
        <div style={{ marginBottom: 6 }}>
          <b>PIN now:</b> {pin || "(none)"} &nbsp; <b>len:</b> {pin.length}
        </div>

        <label>
          PIN:&nbsp;
          <input
            value={pin}
            onChange={(e) => setPinClean(e.target.value)}
            placeholder="6-digit PIN"
            inputMode="numeric"
            maxLength={6}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={studentLogin}>Student Login</button>
        <button onClick={submitAnswerB}>Submit Answer (B)</button>
        <button onClick={logout}>Logout</button>
      </div>

      <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>
        {log}
      </pre>
    </div>
  );
}
