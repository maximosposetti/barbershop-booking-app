import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { createAndSendPhoneVerificationCode } from "@/server/phone/verification";

const phoneVerificationEnabled = process.env.ENABLE_PHONE_VERIFICATION === "true";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone,
      phoneVerifiedAt: phoneVerificationEnabled ? null : new Date(),
      city: parsed.data.city,
      addressStreet: parsed.data.addressStreet,
      addressNumber: parsed.data.addressNumber,
      addressFloor: parsed.data.addressFloor || null,
      addressApartment: parsed.data.addressApartment || null,
      passwordHash
    },
    select: { id: true, name: true, email: true, phone: true }
  });

  if (!phoneVerificationEnabled) {
    return NextResponse.json({ user, phoneVerification: null }, { status: 201 });
  }

  try {
    const verification = await createAndSendPhoneVerificationCode({
      userId: user.id,
      phone: user.phone ?? parsed.data.phone
    });

    return NextResponse.json(
      {
        user,
        phoneVerification: {
          expiresAt: verification.expiresAt,
          devCode: process.env.NODE_ENV === "production" ? undefined : verification.devCode
        }
      },
      { status: 201 }
    );
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar el codigo de WhatsApp." },
      { status: 502 }
    );
  }
}
