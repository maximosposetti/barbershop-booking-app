import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { businessSettingsSchema } from "@/lib/validators";
import { getBusinessSettings, updateHaircutPriceCents } from "@/server/settings/service";

export async function GET() {
  await requireAdmin();

  const settings = await getBusinessSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  await requireAdmin();

  const body = await request.json();
  const parsed = businessSettingsSchema.safeParse({
    haircutPriceCents: Number(body.haircutPriceCents)
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const settings = await updateHaircutPriceCents(parsed.data.haircutPriceCents);
  return NextResponse.json({ settings });
}
