// src/db/schema.ts
import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(extract(epoch from now()) * 1000)::bigint`),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  recipeId: text("recipe_id").notNull(),
  currentStep: integer("current_step").notNull().default(1),
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(extract(epoch from now()) * 1000)::bigint`),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
});

export const turns = pgTable("turns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  role: text("role", { length: 16 }).notNull(), // 'user' | 'agent' | 'system'
  stepId: integer("step_id").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(extract(epoch from now()) * 1000)::bigint`),
});

export const demographics = pgTable("demographics", {
  userId: text("user_id").primaryKey().references(() => users.id),
  gender: text("gender"),
  age: integer("age"),
  cookInterest: integer("cook_interest"),
  experience: text("experience"),
  other: text("other"),

  // NEW: permission flag (default false)
  consent: boolean("consent").notNull().default(false),
});
