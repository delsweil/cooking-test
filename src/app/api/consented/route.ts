// src/app/api/consented/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sessions, demographics } from "@/db/schema";
import { and, eq, gte, desc } from "drizzle-orm";

// parse ?since=24h|7d|30d etc → ms timestamp
function parseSinceMs(since?: string): number | undefined {
  if (!since) return;
  const m = since.match(/^(\d+)\s*([hdw])$/i);
  if (!m) return;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const now = Date.now();
  if (unit === "h") return now - n * 60 * 60 * 1000;
  if (unit === "d") return now - n * 24 * 60 * 60 * 1000;
  if (unit === "w") return now - n * 7 * 24 * 60 * 60 * 1000;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since") || undefined;
    const sinceMs = parseSinceMs(sinceParam);

    // ✅ consent is BOOLEAN now
    const whereClause = sinceMs
      ? and(eq(demographics.consent, true), gte(sessions.startedAt, sinceMs))
      : eq(demographics.consent, true);

    const rows = await db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        recipeId: sessions.recipeId,
        startedAt: sessions.startedAt, // bigint ms
      })
      .from(sessions)
      .innerJoin(demographics, eq(demographics.userId, sessions.userId))
      .where(whereClause)
      .orderBy(desc(sessions.startedAt))
      .limit(500);

    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "server_error" }, { status: 500 });
  }
}
