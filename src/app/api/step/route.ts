// src/app/api/step/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sessions, turns } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getRecipe } from "@/lib/recipes";

/**
 * GET /api/step?sessionId=...
 * {
 *   title: string,
 *   stepNum: number,
 *   total: number,
 *   text: string,
 *   turns: { role: "user"|"agent", text: string, createdAt: number }[]
 * }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!s) return NextResponse.json({ error: "session not found" }, { status: 404 });

    const recipe = getRecipe(s.recipeId);
    if (!recipe) return NextResponse.json({ error: "recipe not found" }, { status: 404 });

    const total = recipe.steps.length;
    const stepNum = Math.min(Math.max(Number(s.currentStep ?? 1), 1), total);
    const text = recipe.steps[stepNum - 1] ?? "";

    const rows = await db
      .select()
      .from(turns)
      .where(and(eq(turns.sessionId, sessionId), eq(turns.stepId, stepNum)))
      .orderBy(turns.createdAt);

    return NextResponse.json({
      title: recipe.title,
      stepNum,
      total,
      text,
      turns: rows.map((r) => ({
        role: r.role as "user" | "agent",
        text: r.text,
        createdAt: r.createdAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
