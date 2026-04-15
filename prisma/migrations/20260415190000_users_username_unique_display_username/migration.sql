-- Better Auth username plugin: unique login + optional display string
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "displayUsername" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Users_username_key" ON "Users"("username");
