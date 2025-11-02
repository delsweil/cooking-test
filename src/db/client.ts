// src/db/client.ts
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";

export const db = drizzle(sql);

// ✅ add this line here (NOT in drizzle.config.ts)
export * as schema from "./schema";
