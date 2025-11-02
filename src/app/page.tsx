"use client";
import { RECIPES } from "@/lib/recipes";
import { useState } from "react";

export default function Page() {
  const [loading, setLoading] = useState<string | null>(null);
  async function start(recipeId: string) {
    setLoading(recipeId);
    const r = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId }) });
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Session error"); setLoading(null); return; }
    window.location.href = `/session/${d.sessionId}`;
  }
  return (
    <main style={{maxWidth: 700, margin: "0 auto", padding: 16}}>
      <h1 style={{fontSize: 24, marginBottom: 12}}>Choose a recipe</h1>
      <div style={{display: "grid", gap: 12}}>
        {RECIPES.map(r => (
          <button key={r.id} onClick={() => start(r.id)} disabled={loading === r.id}
            style={{textAlign:"left", padding:12, borderRadius:12, border:"1px solid #e5e5e5"}}>
            <div style={{fontWeight:600}}>{r.title}</div>
            <div style={{fontSize:12, color:"#666"}}>{r.steps.length} steps</div>
          </button>
        ))}
      </div>
      <div style={{marginTop:12, fontSize:12}}>Diagnostics: <a href="/tech">/tech</a></div>
    </main>
  );
}
