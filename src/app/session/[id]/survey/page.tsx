// src/app/session/[id]/survey/page.tsx
import React from "react";

async function getSession(sessionId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/session?id=${sessionId}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.session as { id: string; userId: string | null };
}

export default async function SurveyPage({
  params,
}: { params: { id: string } }) {
  const session = await getSession(params.id);

  if (!session?.userId) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <h1>Final questions</h1>
        <p style={{ color: "crimson" }}>No userId for session</p>
        <p style={{ color: "#666" }}>
          (Couldn’t load the session record. Try re-opening the session link.)
        </p>
      </main>
    );
  }

  return <SurveyForm sessionId={params.id} userId={session.userId} />;
}

// -------- client form --------
"use client";
import { useState } from "react";

function SurveyForm({ sessionId, userId }: { sessionId: string; userId: string }) {
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<string>("");

  async function submit() {
    setStatus("Saving…");
    const r = await fetch("/api/demographics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        // include your other demographic fields here if you have them on this page
        consent, // boolean → API converts to boolean column
      }),
    });
    const data = await r.json();
    setStatus(r.ok ? "Saved ✔︎" : `Error: ${data.error ?? "failed"}`);
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Final questions</h1>

      <label style={{ display: "flex", gap: 10, alignItems: "start", fontSize: 22 }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ transform: "scale(1.4)", marginTop: 6 }}
        />
        <span>
          I give permission for my conversation to be discussed in class. This may include
          showing excerpts on slides or in class discussion.
        </span>
      </label>

      <div style={{ marginTop: 18 }}>
        <button onClick={submit} style={{ padding: "10px 16px", borderRadius: 8 }}>
          Submit
        </button>
        <span style={{ marginLeft: 10, color: "#666" }}>{status}</span>
      </div>
    </main>
  );
}
