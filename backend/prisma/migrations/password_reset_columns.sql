-- Ejecutar si no usas `prisma migrate dev`:
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_reset_token" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "password_reset_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_password_reset_token_key" ON "users" ("password_reset_token")
  WHERE "password_reset_token" IS NOT NULL;
