// src/app/session/[id]/survey/SurveyFormClient.tsx
"use client";

import { useState } from "react";

export default function SurveyFormClient({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<null | string>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving…");

    try {
      const r = await fetch("/api/demographics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          // include any other fields you collect here…
          consent, // boolean (server turns it into boolean column)
        }),
      });

      if (!r.ok) throw new Error(await r.text());
      setStatus("Saved. Thanks!");
    } catch (err: any) {
      setStatus(`Error: ${err.message ?? "failed"}`);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <label style={{ display: "flex", gap: 12, fontSize: 24, lineHeight: 1.4 }}>
        <input
          type="checkbox"
          checked={!!consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ transform: "scale(1.4)", marginTop: 6 }}
        />
        <span>
          I give permission for my conversation to be discussed in class. This may include
          showing excerpts on slides or in class discussion.
        </span>
      </label>

      {!userId && (
        <div style={{ color: "crimson", marginTop: 12 }}>No userid for session</div>
      )}

      <button
        type="submit"
        disabled={!userId}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: 8,
          background: "black",
          color: "white",
        }}
      >
        Submit
      </button>

      {status && <div style={{ marginTop: 12 }}>{status}</div>}
    </form>
  );
}
