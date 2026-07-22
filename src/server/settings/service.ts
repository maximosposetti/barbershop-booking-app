import { prisma } from "@/lib/prisma";

export const DEFAULT_HAIRCUT_PRICE_CENTS = 1500000;
const DEFAULT_SETTINGS_ID = "default";

export async function getBusinessSettings() {
  return prisma.businessSetting.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: {},
    create: {
      id: DEFAULT_SETTINGS_ID,
      haircutPriceCents: DEFAULT_HAIRCUT_PRICE_CENTS
    }
  });
}

export async function getHaircutPriceCents() {
  const settings = await getBusinessSettings();
  return settings.haircutPriceCents;
}

export async function updateHaircutPriceCents(haircutPriceCents: number) {
  return prisma.businessSetting.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: { haircutPriceCents },
    create: {
      id: DEFAULT_SETTINGS_ID,
      haircutPriceCents
    }
  });
}
