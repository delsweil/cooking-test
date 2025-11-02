// src/db/schema.ts  (Postgres)
import { pgTable, text, integer, boolean, bigint, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";




export const users = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(sql`(extract(epoch from now()) * 1000)::bigint`),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  recipeId: text("recipe_id").notNull(),
  currentStep: integer("current_step").notNull().default(1),
  startedAt: bigint("started_at", { mode: "number" })
    .notNull()
    .default(sql`(extract(epoch from now()) * 1000)::bigint`),
  endedAt: bigint("ended_at", { mode: "number" }),
});

export const turns = pgTable("turns", {
  id: serial("id").primaryKey(),  // ← instead of integer(...autoIncrement)
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  stepId: integer("step_id").notNull(),
  text: text("text").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(sql`(extract(epoch from now()) * 1000)::bigint`),
});

export const demographics = pgTable("demographics", {
  userId: text("user_id").primaryKey(),
  gender: text("gender"),
  age: integer("age"),
  cookInterest: integer("cook_interest"),
  experience: text("experience"),
  other: text("other"),
  // ✅ boolean, default false
  consent: boolean("consent").notNull().default(false),
});

