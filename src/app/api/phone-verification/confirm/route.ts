import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { verifyPhoneCode } from "@/server/phone/verification";

const confirmSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Ingresa el codigo de 6 digitos")
});

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = confirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    await verifyPhoneCode({
      userId: session.user.id,
      code: parsed.data.code
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo verificar el telefono." },
      { status: 400 }
    );
  }
}
