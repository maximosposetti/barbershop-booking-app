import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "La foto debe ser JPG, PNG o WebP." }, { status: 400 });
  }

  if (file.size > maxImageBytes) {
    return NextResponse.json({ error: "La foto no puede superar los 2 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const image = `data:${file.type};base64,${bytes.toString("base64")}`;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { image },
    select: { image: true }
  });

  return NextResponse.json({ image: user.image });
}
