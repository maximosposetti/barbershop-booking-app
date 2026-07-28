import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validators";
import { createAndSendPhoneVerificationCode } from "@/server/phone/verification";

const phoneVerificationEnabled = process.env.ENABLE_PHONE_VERIFICATION === "true";

export async function PUT(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true, phoneVerifiedAt: true }
  });
  const phoneChanged = currentUser?.phone !== parsed.data.phone;
  const requiresPhoneVerification = phoneVerificationEnabled && (phoneChanged || !currentUser?.phoneVerifiedAt);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      phoneVerifiedAt: phoneVerificationEnabled
        ? phoneChanged
          ? null
          : currentUser?.phoneVerifiedAt ?? null
        : currentUser?.phoneVerifiedAt ?? new Date(),
      city: parsed.data.city,
      addressStreet: parsed.data.addressStreet,
      addressNumber: parsed.data.addressNumber,
      addressFloor: parsed.data.addressFloor || null,
      addressApartment: parsed.data.addressApartment || null
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      phoneVerifiedAt: true,
      city: true,
      addressStreet: true,
      addressNumber: true,
      addressFloor: true,
      addressApartment: true,
      image: true
    }
  });

  if (requiresPhoneVerification) {
    try {
      const verification = await createAndSendPhoneVerificationCode({
        userId: session.user.id,
        phone: parsed.data.phone
      });

      return NextResponse.json({
        user,
        requiresPhoneVerification: true,
        redirectTo: "/verificar-telefono?callbackUrl=/perfil",
        phoneVerification: {
          expiresAt: verification.expiresAt,
          devCode: process.env.NODE_ENV === "production" ? undefined : verification.devCode
        }
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "No se pudo enviar el codigo de WhatsApp." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ user, requiresPhoneVerification: false });
}
