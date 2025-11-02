import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { demographics } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const { userId, gender, age, cookInterest, experience, other, consent } =
      await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const consentBool = !!consent; // ✅ normalize to boolean

    await db
      .insert(demographics)
      .values({
        userId,
        gender: gender ?? null,
        age: typeof age === "number" ? age : null,
        cookInterest: typeof cookInterest === "number" ? cookInterest : null,
        experience: experience ?? null,
        other: other ?? null,
        consent: consentBool, // ✅ boolean
      })
      .onConflictDoUpdate({
        target: demographics.userId,
        set: {
          gender: gender ?? null,
          age: typeof age === "number" ? age : null,
          cookInterest: typeof cookInterest === "number" ? cookInterest : null,
          experience: experience ?? null,
          other: other ?? null,
          consent: consentBool, // ✅ boolean
        },
      });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "server_error" }, { status: 500 });
  }
}
