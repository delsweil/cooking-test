-- drizzle/0001_classy_sauron.sql

BEGIN;

-- 1) Drop default so we can change the type
ALTER TABLE "demographics" ALTER COLUMN "consent" DROP DEFAULT;

-- 2) Convert int -> boolean (treat non-1 as false; adjust if you used NULLs)
ALTER TABLE "demographics"
  ALTER COLUMN "consent" TYPE boolean
  USING ("consent" = 1);

-- 3) Put back a boolean default
ALTER TABLE "demographics"
  ALTER COLUMN "consent" SET DEFAULT false;

COMMIT;