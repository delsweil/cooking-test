import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { demographics, sessions } from "@/db/schema";
import { and, eq, gte, desc } from "drizzle-orm";

// helper to convert ?range=24h|7d|30d into a since timestamp (ms)
function sinceFromRange(range?: string) {
  const now = Date.now();
  if (!range) return undefined;
  if (range === "24h") return now - 24 * 3600 * 1000;
  if (range === "7d")  return now - 7  * 24 * 3600 * 1000;
  if (range === "30d") return now - 30 * 24 * 3600 * 1000;
  return undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? undefined;
    const since = sinceFromRange(range);

    // consent is an INTEGER column; compare to 1 (not true)
    const where = since
      ? and(eq(demographics.consent, 1), gte(sessions.startedAt, since))
      : eq(demographics.consent, 1);

    // join sessions ↔ demographics on userId, only consented
    const rows = await db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        recipeId: sessions.recipeId,
        startedAt: sessions.startedAt,
        endedAt: sessions.endedAt,
      })
      .from(sessions)
      .innerJoin(demographics, eq(sessions.userId, demographics.userId))
      .where(where)
      .orderBy(desc(sessions.startedAt));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
