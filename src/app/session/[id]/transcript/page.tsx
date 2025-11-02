"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Turn = {
  stepId: number;
  stepText: string;
  role: "user" | "agent" | "system";
  text: string;
  at: number; // ms
};

type Payload = {
  session: { id: string; userId: string; recipeId: string; startedAt: number; endedAt?: number | null };
  recipe: { title: string; total: number };
  turns: Turn[];
};

export default function TranscriptPage({ params }: { params: { id: string } }) {
  const sessionId = params.id;
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      setErr("");
      const r = await fetch(`/api/transcript?sessionId=${encodeURIComponent(sessionId)}`);
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Failed to load transcript");
        return;
      }
      setData(j);
    })();
  }, [sessionId]);

  const grouped = useMemo(() => {
    const byStep = new Map<number, Turn[]>();
    for (const t of data?.turns ?? []) {
      if (!byStep.has(t.stepId)) byStep.set(t.stepId, []);
      byStep.get(t.stepId)!.push(t);
    }
    return [...byStep.entries()].sort((a, b) => a[0] - b[0]);
  }, [data]);

  function dl(filename: string, content: string, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJSON() {
    if (!data) return;
    dl(`transcript_${data.session.id}.json`, JSON.stringify(data, null, 2), "application/json");
  }

  function downloadTXT() {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`${data.recipe.title}`);
    lines.push(`Session: ${data.session.id}`);
    lines.push("");
    for (const [stepId, turns] of grouped) {
      const text = turns[0]?.stepText ?? "";
      lines.push(`Step ${stepId}/${data.recipe.total} — ${text}`);
      for (const t of turns) {
        const at = new Date(t.at).toLocaleString();
        const who = t.role === "agent" ? "Agent" : t.role === "user" ? "User" : "System";
        lines.push(`  [${at}] ${who}: ${t.text}`);
      }
      lines.push("");
    }
    dl(`transcript_${data.session.id}.txt`, lines.join("\n"));
  }

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Transcript</div>
          <h1 className="text-2xl font-bold">
            {data?.recipe.title ?? "…"}
          </h1>
          <div className="text-sm text-gray-500">
            Session {sessionId}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTXT} className="rounded-lg border px-3 py-2">Download .txt</button>
          <button onClick={downloadJSON} className="rounded-lg border px-3 py-2">Download .json</button>
        </div>
      </div>

      {err && <div className="text-red-600">{err}</div>}

      <div className="space-y-6">
        {grouped.map(([stepId, turns]) => (
          <section key={stepId} className="space-y-2">
            <h2 className="text-lg font-semibold">
              Step {stepId}/{data?.recipe.total} — {turns[0]?.stepText ?? ""}
            </h2>
            <div className="space-y-2">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={`max-w-prose rounded-2xl px-4 py-3 ${
                    t.role === "user" ? "ml-auto bg-blue-50" : "mr-auto bg-gray-100"
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    {new Date(t.at).toLocaleString()} • {t.role}
                  </div>
                  {t.text}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="pt-4">
        <Link href={`/session/${sessionId}`} className="underline">
          ← Back to chat
        </Link>
      </div>
    </main>
  );
}
