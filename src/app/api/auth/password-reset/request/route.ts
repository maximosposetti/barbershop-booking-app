import crypto from "crypto";
import { NextResponse } from "next/server";
import { getPublicAppUrl } from "@/lib/app-url";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { passwordResetRequestSchema } from "@/lib/validators";
import { sendPasswordResetEmail } from "@/server/email/send-confirmation";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const body = await request.json().catch(() => ({}));
  const parsed = passwordResetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const email = session?.user?.email ?? parsed.data.email;
  if (!email) return NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true }
  });

  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  });

  const appUrl = getPublicAppUrl();
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
  await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl });

  return NextResponse.json({ ok: true });
}
