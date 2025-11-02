"use client";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function ConsentedList() {
  const { data } = useSWR<{ rows: any[] }>("/api/consented?range=7d", fetcher);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Consented Conversations (last 7d)</h1>
      <div style={{ margin: "12px 0" }}>
        <a href="/api/consented?range=24h">24h</a>{" · "}
        <a href="/api/consented?range=7d">7d</a>{" · "}
        <a href="/api/consented?range=30d">30d</a>{" · "}
        <a href="/api/consented">All</a>
      </div>

      <ul style={{ display: "grid", gap: 8 }}>
        {data?.rows?.map((r) => (
          <li key={r.sessionId} style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
            <div><strong>Session:</strong> <a href={`/session/${r.sessionId}/transcript`}>{r.sessionId}</a></div>
            <div><strong>User:</strong> {r.userId}</div>
            <div><strong>Recipe:</strong> {r.recipeId}</div>
            <div><strong>Started:</strong> {new Date(r.startedAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
