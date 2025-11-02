import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sessions, turns } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getRecipe } from "@/lib/recipes";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!s) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const recipe = getRecipe(s.recipeId);
  const total = recipe?.steps?.length ?? 0;

  const rows = await db
    .select()
    .from(turns)
    .where(eq(turns.sessionId, sessionId))
    .orderBy(asc(turns.stepId), asc(turns.createdAt));

  const mapped = rows.map((r) => ({
    stepId: r.stepId,
    stepText: recipe?.steps?.[r.stepId - 1] ?? "",
    role: r.role as "user" | "agent" | "system",
    text: r.text,
    at: r.createdAt, // ms timestamp
  }));

  return NextResponse.json({
    session: {
      id: s.id,
      userId: s.userId,
      recipeId: s.recipeId,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    },
    recipe: { title: recipe?.title ?? s.recipeId, total },
    turns: mapped,
  });
}
