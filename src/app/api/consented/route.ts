import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sessions, demographics } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";

function parseSince(range: string | null): number | null {
  const now = Date.now();
  switch ((range || "all").toLowerCase()) {
    case "24h":
    case "1d":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
    case "week":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
    case "month":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range");
    const since = parseSince(range);

    // join sessions to demographics on userId where consent = true
    const where = since
      ? and(eq(demographics.consent, true), gte(sessions.startedAt, since))
      : eq(demographics.consent, true);

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
      .orderBy(sessions.startedAt);

    return NextResponse.json({ ok: true, range: range || "all", sessions: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
