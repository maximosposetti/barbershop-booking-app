import { ImageCategory } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  await requireAdmin();
  const images = await prisma.galleryImage.findMany({
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ images });
}

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "Imagen");
  const category = String(formData.get("category") ?? "SHOP") as ImageCategory;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!Object.values(ImageCategory).includes(category)) {
    return NextResponse.json({ error: "Categoria invalida" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), bytes);

  const image = await prisma.galleryImage.create({
    data: {
      title,
      category,
      url: `/uploads/${safeName}`
    }
  });

  return NextResponse.json({ image }, { status: 201 });
}
