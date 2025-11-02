// src/app/api/message/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sessions, turns } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getRecipe } from "@/lib/recipes";
import {
  buildDeepseekSystemPrompt,     // we keep the name; it's just the base system text you wrote
  buildAgentUserMessage,
  buildContextBlock,
  detectNeed,
  extractFinalAnswer,            // kept for compatibility (we’ll also add a lenient extractor)
  expandUserQuestion,
} from "@/lib/agentPrompt";

// -------------- small helpers --------------
const NEXT_RX =
  /\b(next( step)?|next step please|i\s*am\s*ready( for the next step)?|weiter)\b/i;

type ChatMsg = { role: "user" | "assistant"; content: string };


function stripThink(x: string) {
  return x.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractFinal(x: string): string | null {
  const m = stripThink(x).match(/FINAL\s*:\s*([\s\S]+)/i);
  if (!m) return null;
  return m[1].split(/```/)[0].trim();
}

/** console.log only when OPENAI_DEBUG is set */
function debug(...args: any[]) {
  if (process.env.OPENAI_DEBUG) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

/** Ask OpenAI (non-streaming) and return the raw content string */
async function askOpenAI({
  systemMsg,
  historyMessages,
  userMsg,
  model,
  maxTokens = 250,
}: {
  systemMsg: string;
  historyMessages: { role: "user" | "assistant"; content: string }[];
  userMsg: string;
  model: string;
  maxTokens?: number;
}) {
  const body = {
    model,
    messages: [
      { role: "system", content: systemMsg },
      ...historyMessages,
      { role: "user", content: userMsg },
    ],
    temperature: 0.2,
    top_p: 0.9,
    max_completion_tokens: maxTokens,
  };

  debug("\n--- AGENT DEBUG ---");
  debug({
    provider: "openai",
    model,
    userMsg,
    historyMessagesCount: historyMessages.length,
  });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`OpenAI HTTP ${r.status}: ${text}`);
  }

  const data = await r.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  debug({ rawOpenAI: raw?.slice?.(0, 500) });
  return raw;
}

/** Prefer FINAL:, but if missing, return a trimmed version of the content so the UI shows something useful */
function extractFinalAnswerLenient(raw: string): string | null {
  if (!raw) return null;

  // Preferred: explicit "FINAL: …"
  const final = extractFinal(raw);
  if (final && final.length >= 8) return `FINAL: ${final}`;

  // Otherwise show trimmed/no-think content
  const noThink = stripThink(raw).trim();
  if (noThink.length >= 8) return noThink;

  return null;
}

// -------------- route --------------
export async function POST(req: Request) {
  try {
    const { sessionId, content } = await req.json();
    if (!sessionId || !content) {
      return NextResponse.json(
        { error: "sessionId and content required" },
        { status: 400 }
      );
    }

    // Load session + recipe
    const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!s) return NextResponse.json({ error: "session not found" }, { status: 404 });

    const recipe = getRecipe(s.recipeId);
    if (!recipe) return NextResponse.json({ error: "recipe not found" }, { status: 404 });

    // Clamp step
    const total = recipe.steps.length || 1;
    const currentStep = Math.min(Math.max(Number(s.currentStep ?? 1), 1), total);
    const stepIdx = currentStep - 1;
    const stepText = recipe.steps[stepIdx] ?? "";

    // Always store the user turn
    await db.insert(turns).values({
      sessionId,
      role: "user",
      stepId: currentStep,
      text: content,
    });

    // Handle "next"/finish
    const saidNext = NEXT_RX.test(content.trim());
    const alreadyFinished = !!s.endedAt;
    const isLastStep = currentStep >= total;

    if (saidNext) {
      if (isLastStep || alreadyFinished) {
        if (!alreadyFinished) {
          await db.update(sessions)
  .set({ endedAt: Date.now() })
  .where(eq(sessions.id, sessionId));
        }
        return NextResponse.json({ type: "finished" });
      }
      await db
        .update(sessions)
        .set({ currentStep: currentStep + 1 })
        .where(eq(sessions.id, sessionId));
      const nowLast = currentStep + 1 >= total;
      return NextResponse.json({ type: nowLast ? "step-advance-last" : "step-advance" });
    }

    // Build per-step history (for context)
    const historyRows = await db
      .select()
      .from(turns)
      .where(and(eq(turns.sessionId, sessionId), eq(turns.stepId, currentStep)))
      .orderBy(turns.createdAt);

    const historyMessages: ChatMsg[] = historyRows
  .slice(-8)
  .map((t): ChatMsg => ({
    role: t.role === "agent" ? "assistant" : "user",
    content: t.text,
  }));


    // Prompt assembly
    const expandedUser = expandUserQuestion(content, stepText);
    const need = detectNeed(expandedUser) || detectNeed(content) || undefined;

    const systemBase = buildDeepseekSystemPrompt(); // your concise assistant rules
    const contextBlock = buildContextBlock(
      recipe.title,
      currentStep,
      total,
      stepText,
      need
    );

    const systemMsg =
      `${systemBase}\n\n${contextBlock}\n\n` +
      `IMPORTANT: Put the final answer after "FINAL:".`;

    const userMsg = buildAgentUserMessage(
      recipe.title,
      currentStep,
      total,
      stepText,
      expandedUser,
      need
    );

    // Ask OpenAI (with strict retry)
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    let reply: string;
    try {
      // Pass 1
      const raw1 = await askOpenAI({
        systemMsg,
        historyMessages,
        userMsg,
        model,
      });
      reply = extractFinalAnswerLenient(raw1) ?? "";

      // Strict retry if too short or missing
      if (!reply || reply.length < 10) {
        const strictSystem =
          systemMsg +
          `\n\nSTRICT: Answer in 1–3 sentences and START your final line with 'FINAL: '.`;
        const raw2 = await askOpenAI({
          systemMsg: strictSystem,
          historyMessages,
          userMsg,
          model,
        });
        reply = extractFinalAnswerLenient(raw2) ?? "";
      }

      if (!reply) {
        reply = "I'm not sure. Could you rephrase or ask about a smaller part of this step?";
      }
    } catch (err: any) {
      // Always show something useful on error
      reply = "I'm not sure about this step. Could you rephrase or ask about a smaller part?";
      debug("OpenAI error:", err?.message || err);
    }

    // Store agent turn
    await db.insert(turns).values({
      sessionId,
      role: "agent",
      stepId: currentStep,
      text: reply,
    });

    return NextResponse.json({ type: "answer", text: reply });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
