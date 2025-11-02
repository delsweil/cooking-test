// src/lib/llm.ts
import OpenAI from "openai";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callLLM({
  system,
  user,
  history = [],
  temperature = 0.2,
  stop,
}: {
  system: string;
  user: string;
  history?: ChatMsg[];
  temperature?: number;
  stop?: string[];
}): Promise<string> {
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature,
    stop,
    messages: [
      { role: "system", content: system },
      ...history,
      { role: "user", content: user },
    ],
  });
  return res.choices?.[0]?.message?.content ?? "";
}
