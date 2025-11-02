import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';



export async function POST(req: Request) {
  const { recipeId } = await req.json();
  if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 });

  const jar = cookies();
  let uid = jar.get('uid')?.value;
  if (!uid) {
    uid = crypto.randomUUID();
    jar.set('uid', uid, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  }

  const existing = await db.select().from(users).where(eq(users.id, uid));
  if (existing.length === 0) await db.insert(users).values({ id: uid });

  const sid = crypto.randomUUID();
  await db.insert(sessions).values({ id: sid, userId: uid, recipeId, currentStep: 1 });

  return NextResponse.json({ sessionId: sid, currentStep: 1 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const [s] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!s) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }
  return NextResponse.json({ session: s });
}