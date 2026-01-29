"use client";

import { useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function Page() {
  const [log, setLog] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("lecturer@test.com");
  const [password, setPassword] = useState("Test1234!");

  async function lecturerLogin() {
    setLog("Logging in as lecturer...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setLog("❌ Login error: " + error.message);

    // one-time role setup (safe to run many times)
    const { error: pErr } = await supabase.from("my_profile_api").update({
      role: "lecturer",
      firstName: "Test",
      lastName: "Lecturer",
    });

    if (pErr) return setLog("❌ Profile update error: " + pErr.message);

    setLog("✅ Lecturer login OK + role set");
  }

  async function revealAndScore() {
    const cleanPin = pin.replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) return setLog("❌ Enter 6-digit PIN first.");

    setLog("Revealing + scoring current question...");

    const { error } = await supabase.rpc("reveal_and_score_current_question", {
      p_pin: cleanPin,
      p_max_time: 60,
    });

    if (error) return setLog("❌ reveal_and_score error: " + error.message);

    setLog("✅ Revealed + scored! Now check SQL: status should be 'answer'.");
  }

  async function logout() {
    await supabase.auth.signOut();
    setLog("Logged out ✅");
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>DB Test (Lecturer)</h1>

      <div style={{ marginBottom: 10 }}>
        <div style={{ marginBottom: 6 }}>
          <label>Email:&nbsp;</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label>Password:&nbsp;</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>PIN:&nbsp;</label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="6-digit PIN"
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={lecturerLogin}>Lecturer Login</button>
        <button onClick={revealAndScore}>Reveal & Score</button>
        <button onClick={logout}>Logout</button>
      </div>

      <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>
        {log}
      </pre>
    </div>
  );
}
