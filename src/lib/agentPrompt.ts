// src/lib/agentPrompt.ts

// System prompt tuned for DeepSeek-R1 with few-shot & disambiguation rules.
export function buildDeepseekSystemPrompt() {
  return [
    "You are a cooking assistant helping with ONE recipe step at a time.",
    "Answer ONLY about the CURRENT step; do not preview future steps or recap the whole recipe.",
    "Be concise: 1–3 sentences (or up to 3 short bullets).",
    "If asked for an image/picture: apologize once and say you cannot show images.",
    "If you truly don't know, say “I'm not sure” and optionally add ONE practical tip or ask ONE brief clarifying question.",
    "",
    "Interpret short or deictic follow-ups relative to the CURRENT step:",
    "- If the user says “why?”, answer why this step is done (the rationale/science).",
    "- If they say “how long?”, give a practical timing/cue for this step.",
    "- If they say “what now/next?”, keep them within the CURRENT step unless they explicitly say 'next'.",
    "",
    "IMPORTANT OUTPUT RULE:",
    "Write your final answer starting with FINAL: and nothing else. Do not include JSON or code fences.",
    "You may think privately, but never show <think> or your reasoning.",
    "",
    "EXAMPLES",
    "User: why?",
    "Assistant: FINAL: Boiling the water fully hydrates the flour and starts starch gelatinization, so the dough forms a smooth paste before eggs are added.",
    "User: how long?",
    "Assistant: FINAL: Stir vigorously until the dough pulls cleanly from the pot and leaves a thin film—usually 1–3 minutes rather than a fixed clock."
  ].join("\n");
}

export function buildAgentUserMessage(
  title: string,
  stepNum: number,
  totalSteps: number,
  stepText: string,
  userContent: string,
  needHint?: "TASK" | "SCIENCE" | "HISTORY"
) {
  return [
    `Recipe: ${title}`,
    `Current step ${stepNum}/${totalSteps}: ${stepText}`,
    needHint ? `NEED: ${needHint}` : "",
    "",
    `User: ${userContent}`
  ].filter(Boolean).join("\n");
}

// Context block that we prepend in the system message (already used in your route)
export function buildContextBlock(
  title: string,
  stepNum: number,
  totalSteps: number,
  stepText: string,
  needHint?: "TASK" | "SCIENCE" | "HISTORY"
) {
  return [
    `CONTEXT`,
    `- Recipe: ${title}`,
    `- Current step ${stepNum}/${totalSteps}: ${stepText}`,
    needHint ? `- Need hint: ${needHint}` : null,
  ].filter(Boolean).join("\n");
}

// Expand very short user questions so the model never loses reference.
export function expandUserQuestion(raw: string, stepText: string): string {
  const t = raw.trim().toLowerCase();
  if (/^why\??$/.test(t))
    return `Why is this step done: "${stepText}"? Please explain the underlying rationale/science briefly.`;
  if (/^how\s*long\??$/.test(t) || /^(time\??)$/.test(t))
    return `Approximately how long should I perform this step: "${stepText}"? Give a practical cue (appearance/texture).`;
  if (/^(what\s*now|what\s*next)\??$/.test(t))
    return `Given this current step — "${stepText}" — what should I do within this step (not the next step)?`;
  if (/^(what\s*about\s*the\s*history\??)$/.test(t))
    return `What is the historical background relevant to this step: "${stepText}"?`;
  return raw;
}

// Extract only the final answer. Always strip any "FINAL:" marker (including bold variants).
export function extractFinalAnswer(raw: string) {
  if (!raw) return "";
  // Prefer the last "FINAL:" block if multiple.
  const finals = raw.match(/FINAL:\s*([\s\S]*?)$/gi);
  let out = finals && finals.length ? finals[finals.length - 1].replace(/^FINAL:\s*/i, "") : raw;
  // If there was a </think>, take text after it.
  const endThink = out.lastIndexOf("</think>");
  if (endThink >= 0) out = out.slice(endThink + "</think>".length);
  return clean(out);
}

function clean(s: string) {
  if (!s) return "";
  return s
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
    .replace(/^\s*(thought|reasoning|analysis)\s*:\s*[\s\S]*?\n\s*\n/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*\*{1,3}\s*/g, "")      // strip leading markdown like "** "
    .replace(/(?:\bNot\s+say\b[\s\S]{0,30}){3,}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Lightweight need classifier to hint the model.
export function detectNeed(userText: string): "TASK" | "SCIENCE" | "HISTORY" | undefined {
  const t = userText.toLowerCase();
  if (/\b(science|why|chemistry|physics|emulsif|gelatin|denatur|maillard)\b/.test(t)) return "SCIENCE";
  if (/\b(history|origin|where|when|traditional|invent|etymolog)\b/.test(t)) return "HISTORY";
  if (/\b(how|what.*way|technique|temperature|time|when do|how long)\b/.test(t)) return "TASK";
  return undefined;
}
