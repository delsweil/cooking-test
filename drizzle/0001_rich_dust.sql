ALTER TABLE "sessions" ALTER COLUMN "started_at" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "started_at" SET DEFAULT (extract(epoch from now()) * 1000)::bigint;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "ended_at" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "turns" ALTER COLUMN "id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "turns" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "turns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "turns" ALTER COLUMN "created_at" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "turns" ALTER COLUMN "created_at" SET DEFAULT (extract(epoch from now()) * 1000)::bigint;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT (extract(epoch from now()) * 1000)::bigint;--> statement-breakpoint
ALTER TABLE "demographics" ADD COLUMN "consent" boolean DEFAULT false NOT NULL;