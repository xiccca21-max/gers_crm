-- AlterEnum: Russian UI language for GERS fork (idempotent on PG < 15)
DO $$ BEGIN
  ALTER TYPE "Language" ADD VALUE 'ru';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
