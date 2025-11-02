"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SurveyPage({ params }: { params: { id: string } }) {
  const sessionId = params.id;
  const router = useRouter();

  const [gender, setGender] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [cookInterest, setCookInterest] = useState<number | "">("");
  const [experience, setExperience] = useState("");
  const [other, setOther] = useState("");
  const [consent, setConsent] = useState(false); // NEW

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      setSaving(true);
      setError(null);

      // fetch userId for this session (if you already have userId in props, skip this)
      const r1 = await fetch(`/api/session?id=${sessionId}`, { cache: "no-store" });
      const s = await r1.json();
      const userId = s?.session?.userId;
      if (!userId) throw new Error("No userId for session");

      const body = {
        userId,
        gender: gender || null,
        age: age === "" ? null : Number(age),
        cookInterest: cookInterest === "" ? null : Number(cookInterest),
        experience: experience || null,
        other: other || null,
        consent, // NEW
      };

      const r = await fetch("/api/demographics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());

      router.push(`/session/${sessionId}/thanks`);
    } catch (e: any) {
      setError(e.message || "Failed to save survey");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1>Final questions</h1>
      {/* … your existing fields … */}

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I give permission for my conversation to be discussed in class. This may include showing excerpts on slides or in class discussion.
        </span>
      </label>

      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      <button
        onClick={submit}
        disabled={saving}
        style={{ marginTop: 16, padding: "8px 12px", borderRadius: 8 }}
      >
        {saving ? "Saving…" : "Submit"}
      </button>
    </main>
  );
}
