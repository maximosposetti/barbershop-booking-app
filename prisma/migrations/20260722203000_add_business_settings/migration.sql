CREATE TABLE "BusinessSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "haircutPriceCents" INTEGER NOT NULL DEFAULT 1500000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BusinessSetting" ("id", "haircutPriceCents", "createdAt", "updatedAt")
VALUES ('default', 1500000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Reservation" ALTER COLUMN "priceCents" SET DEFAULT 1500000;
