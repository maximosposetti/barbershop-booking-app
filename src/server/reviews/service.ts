import { createHash, randomBytes } from "node:crypto";
import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendReviewInvitationEmail } from "@/server/email/send-confirmation";

const reviewDelayMs = 30 * 60 * 1000;
const reviewTokenDays = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createReviewToken() {
  return randomBytes(32).toString("hex");
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function getReviewInvitationByToken(token: string) {
  const tokenHash = hashToken(token);

  return prisma.reviewInvitation.findUnique({
    where: { tokenHash },
    include: {
      reservation: {
        include: {
          barber: { select: { id: true, name: true, imageUrl: true } },
          user: { select: { id: true, name: true, email: true, image: true } },
          review: true
        }
      }
    }
  });
}

export async function submitReservationReview({
  token,
  rating,
  comment
}: {
  token: string;
  rating: number;
  comment: string;
}) {
  const invitation = await getReviewInvitationByToken(token);
  const now = new Date();

  if (!invitation) {
    throw new Error("El enlace de reseña no es valido.");
  }

  if (invitation.usedAt || invitation.reservation.review) {
    throw new Error("Esta reseña ya fue enviada.");
  }

  if (invitation.expiresAt && invitation.expiresAt < now) {
    throw new Error("El enlace de reseña vencio.");
  }

  if (invitation.reservation.status !== ReservationStatus.COMPLETED || invitation.reservation.endAt.getTime() + reviewDelayMs > now.getTime()) {
    throw new Error("La reseña solo puede enviarse despues de que el turno finalice correctamente.");
  }

  const review = await prisma.$transaction(async (tx) => {
    const createdReview = await tx.review.create({
      data: {
        reservationId: invitation.reservation.id,
        userId: invitation.reservation.user.id,
        barberId: invitation.reservation.barber.id,
        name: invitation.reservation.user.name ?? invitation.reservation.user.email,
        rating,
        comment
      },
      include: {
        user: { select: { name: true, email: true, image: true } },
        barber: { select: { name: true } }
      }
    });

    await tx.reviewInvitation.update({
      where: { id: invitation.id },
      data: { usedAt: now }
    });

    return createdReview;
  });

  return review;
}

export async function sendPendingReviewInvitations() {
  const now = new Date();
  const eligibleEndAt = new Date(now.getTime() - reviewDelayMs);
  const expiresAt = new Date(now.getTime() + reviewTokenDays * 24 * 60 * 60 * 1000);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.COMPLETED,
      endAt: { lte: eligibleEndAt },
      review: null,
      OR: [{ reviewInvitation: null }, { reviewInvitation: { sentAt: null } }]
    },
    include: {
      barber: { select: { name: true } },
      user: { select: { email: true, name: true } },
      reviewInvitation: true
    },
    take: 25
  });

  let sent = 0;

  for (const reservation of reservations) {
    const token = createReviewToken();
    const tokenHash = hashToken(token);
    const reviewUrl = `${getAppUrl()}/resena/${token}`;

    await prisma.reviewInvitation.upsert({
      where: { reservationId: reservation.id },
      create: {
        reservationId: reservation.id,
        tokenHash,
        expiresAt
      },
      update: {
        tokenHash,
        expiresAt,
        usedAt: null
      }
    });

    const delivered = await sendReviewInvitationEmail({
      startAt: reservation.startAt,
      barber: reservation.barber,
      user: reservation.user,
      reviewUrl
    });

    if (delivered) {
      await prisma.reviewInvitation.update({
        where: { reservationId: reservation.id },
        data: { sentAt: now }
      });
      sent += 1;
    }
  }

  return { checked: reservations.length, sent };
}

export async function getReviewAverages() {
  const [general, byBarber] = await Promise.all([
    prisma.review.aggregate({
      where: { barberId: { not: null } },
      _avg: { rating: true },
      _count: { rating: true }
    }),
    prisma.review.groupBy({
      by: ["barberId"],
      where: { barberId: { not: null } },
      _avg: { rating: true },
      _count: { rating: true }
    })
  ]);

  return {
    general: {
      average: general._avg.rating ?? 0,
      count: general._count.rating
    },
    byBarber: new Map(
      byBarber.map((item) => [
        item.barberId,
        {
          average: item._avg.rating ?? 0,
          count: item._count.rating
        }
      ])
    )
  };
}
