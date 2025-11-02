// src/app/session/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type StepPayload = {
  title: string;
  stepNum: number;
  total: number;
  text: string;
  turns?: { role: "user" | "agent"; text: string }[];
};

type Msg = { role: "user" | "agent"; text: string };

export default function SessionPage({ params }: { params: { id: string } }) {
  const sessionId = params.id;
  const router = useRouter();

  const [step, setStep] = useState<StepPayload | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function normalizeStepResponse(j: any): StepPayload {
    const title = j?.title ?? j?.recipeTitle ?? j?.recipe_title ?? "Recipe";
    const total =
      Number(
        j?.total ??
          j?.totalSteps ??
          j?.steps_total ??
          (Array.isArray(j?.steps) ? j.steps.length : 1)
      ) || 1;
    const stepNum = Math.min(
      Math.max(Number(j?.stepNum ?? j?.currentStep ?? 1) || 1, 1),
      total
    );
    const text =
      j?.text ??
      j?.stepText ??
      j?.step_description ??
      (Array.isArray(j?.steps) ? j.steps[stepNum - 1] : "") ??
      "";
    const turnsArr = j?.turns ?? [];
    const turns = Array.isArray(turnsArr)
      ? turnsArr.map((t: any) => ({
          role:
            (t?.role === "assistant" ? "agent" : t?.role) ??
            t?.speaker ??
            "agent",
          text: t?.text ?? t?.content ?? "",
        }))
      : [];
    return { title, total, stepNum, text, turns };
  }

  async function loadStep() {
    setStatus("loading step…");
    const r = await fetch(`/api/step?sessionId=${encodeURIComponent(sessionId)}`);
    const j = await r.json().catch(() => ({} as any));
    setStatus(`GET /api/step → ${r.status}`);
    if (!r.ok) {
      alert(j.error || "Failed to load step");
      return;
    }
    const payload = normalizeStepResponse(j);
    setStep(payload);
    setMsgs(payload.turns ?? []);
  }

  useEffect(() => {
    loadStep();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const content = input.trim();
    if (!content || loading) return;

    setMsgs((m) => [...m, { role: "user", text: content }]);
    setInput("");
    setLoading(true);
    setStatus("posting message…");

    try {
      const r = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content }),
      });
      const d = await r.json().catch(() => ({} as any));
      setStatus(`POST /api/message → ${r.status} (${d.type || "no type"})`);

      if (!r.ok) {
        setMsgs((m) => [...m, { role: "agent", text: d.error || "Server error" }]);
        return;
      }

      if (d.type === "finished") {
        router.push(`/session/${sessionId}/survey`);
        return;
      }

      if (d.type === "step-advance" || d.type === "step-advance-last") {
        await loadStep();
        return;
      }

      if (d.type === "answer" && d.text) {
        setMsgs((m) => [...m, { role: "agent", text: d.text }]);
      } else {
        setMsgs((m) => [...m, { role: "agent", text: JSON.stringify(d) || "(empty reply)" }]);
      }
    } catch (e: any) {
      setStatus(`POST failed: ${e?.message || e}`);
      setMsgs((m) => [...m, { role: "agent", text: `Error: ${e?.message || String(e)}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 12 }}>
      <header className="space-y-1" style={{ marginBottom: 12 }}>
        <div className="text-sm text-gray-500 flex items-center gap-3">
          {step?.title || "Recipe"}
          <Link
            href={`/session/${sessionId}/transcript`}
            className="underline"
            prefetch={false}
          >
            View transcript
          </Link>
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          Step {step?.stepNum}/{step?.total} —{" "}
          <span style={{ fontWeight: 400 }}>{step?.text}</span>
        </h1>
      </header>

      <div style={{ marginTop: 8, marginBottom: 8, color: "#666" }}>
        {status}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: "70ch",
              borderRadius: 12,
              padding: "10px 12px",
              background: m.role === "user" ? "#e8f0fe" : "#f3f4f6",
              marginLeft: m.role === "user" ? "auto" : 0,
            }}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about this step or say 'next'…"
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "#111",
            color: "white",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </main>
  );
}
