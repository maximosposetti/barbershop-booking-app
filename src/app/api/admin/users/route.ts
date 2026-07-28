import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      addressStreet: true,
      addressNumber: true,
      addressFloor: true,
      addressApartment: true,
      role: true,
      createdAt: true
    }
  });

  return NextResponse.json({ users });
}
