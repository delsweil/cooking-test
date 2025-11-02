// src/app/session/[id]/survey/page.tsx
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import SurveyFormClient from "./SurveyFormClient";

type Params = { params: { id: string } };

export default async function SurveyPage({ params }: Params) {
  const sessionId = params.id;

  // server-side lookup
  const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!s) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1>Final questions</h1>
        <p style={{ color: "crimson" }}>Unknown session.</p>
        <Link href="/">Start over</Link>
      </main>
    );
  }

  const [u] = await db.select().from(users).where(eq(users.id, s.userId));
  const userId = u?.id;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>Final questions</h1>
      <SurveyFormClient sessionId={sessionId} userId={userId ?? ""} />
    </main>
  );
}
