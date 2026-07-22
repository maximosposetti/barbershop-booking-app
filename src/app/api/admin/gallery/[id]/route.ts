import { ImageCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const galleryUpdateSchema = z.object({
  title: z.string().min(2),
  category: z.nativeEnum(ImageCategory),
  url: z.string().min(1)
});

export async function PUT(request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json();
  const parsed = galleryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const image = await prisma.galleryImage.update({
    where: { id },
    data: parsed.data
  });

  return NextResponse.json({ image });
}

export async function DELETE(_request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  await prisma.galleryImage.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
