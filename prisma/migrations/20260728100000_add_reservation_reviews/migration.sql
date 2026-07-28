ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "reservationId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "barberId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "ReviewInvitation" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_reservationId_key" ON "Review"("reservationId");
CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "Review"("userId");
CREATE INDEX IF NOT EXISTS "Review_barberId_idx" ON "Review"("barberId");
CREATE INDEX IF NOT EXISTS "Review_createdAt_idx" ON "Review"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewInvitation_reservationId_key" ON "ReviewInvitation"("reservationId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewInvitation_tokenHash_key" ON "ReviewInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "ReviewInvitation_tokenHash_idx" ON "ReviewInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "ReviewInvitation_sentAt_idx" ON "ReviewInvitation"("sentAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_reservationId_fkey'
  ) THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_userId_fkey'
  ) THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_barberId_fkey'
  ) THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_barberId_fkey"
    FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReviewInvitation_reservationId_fkey'
  ) THEN
    ALTER TABLE "ReviewInvitation" ADD CONSTRAINT "ReviewInvitation_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
