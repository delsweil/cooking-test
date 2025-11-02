"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  sessionId: string;
  userId: string;
  recipeId: string;
  startedAt: number | null;
  endedAt: number | null;
};

const RANGES = [
  { key: "all", label: "All time" },
  { key: "24h", label: "Last 24h" },
  { key: "7d", label: "Last week" },
  { key: "30d", label: "Last month" },
];

export default function ConsentedPage() {
  const [range, setRange] = useState("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/consented?range=${range}`, { cache: "no-store" });
        const j = await r.json();
        setRows(j.sessions || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Consented Conversations</h1>

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <label>
          Filter:&nbsp;
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <div>Loading…</div>}

      {!loading && rows.length === 0 && (
        <div>No conversations found for this range.</div>
      )}

      <ul style={{ display: "grid", gap: 8, padding: 0, listStyle: "none" }}>
        {rows.map((row) => (
          <li key={row.sessionId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            <div><strong>Session:</strong>{" "}
              <Link href={`/session/${row.sessionId}/transcript`} className="underline">
                {row.sessionId}
              </Link>
            </div>
            <div><strong>User:</strong> {row.userId}</div>
            <div><strong>Recipe:</strong> {row.recipeId}</div>
            <div style={{ color: "#666" }}>
              <strong>Started:</strong>{" "}
              {row.startedAt ? new Date(row.startedAt).toLocaleString() : "—"}
              {"  "}·{" "}
              <strong>Ended:</strong>{" "}
              {row.endedAt ? new Date(row.endedAt).toLocaleString() : "—"}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
