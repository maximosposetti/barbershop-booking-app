import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAndSendPhoneVerificationCode } from "@/server/phone/verification";

export async function POST() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true, phoneVerifiedAt: true }
  });

  if (!user?.phone) {
    return NextResponse.json({ error: "Primero agrega un telefono celular." }, { status: 400 });
  }

  if (user.phoneVerifiedAt) {
    return NextResponse.json({ error: "Este telefono ya esta verificado." }, { status: 409 });
  }

  const latest = await prisma.phoneVerificationCode.findFirst({
    where: { userId: session.user.id, phone: user.phone, usedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true }
  });

  if (latest && Date.now() - latest.createdAt.getTime() < 60 * 1000) {
    return NextResponse.json({ error: "Espera un minuto antes de pedir otro codigo." }, { status: 429 });
  }

  try {
    const result = await createAndSendPhoneVerificationCode({
      userId: session.user.id,
      phone: user.phone
    });

    return NextResponse.json({
      ok: true,
      expiresAt: result.expiresAt,
      devCode: process.env.NODE_ENV === "production" ? undefined : result.devCode
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar el codigo." },
      { status: 502 }
    );
  }
}
