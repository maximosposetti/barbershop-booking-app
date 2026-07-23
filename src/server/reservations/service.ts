import { addDays, format, startOfDay } from "date-fns";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { demoBarbers } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { getHaircutPriceCents } from "@/server/settings/service";

const TURN_SLOT_MINUTES = 30;
const TURN_SLOT_MS = TURN_SLOT_MINUTES * 60_000;
const MIN_BOOKING_NOTICE_MS = 24 * 60 * 60 * 1000;
const PENDING_PAYMENT_HOLD_MS = 20 * 60 * 1000;

type AvailabilitySlot = {
  startAt: string;
  endAt: string;
  available: boolean;
};

function timeOnDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function dedupeSlots(slots: AvailabilitySlot[]) {
  const slotsByStart = new Map<string, AvailabilitySlot>();

  for (const slot of slots) {
    const existing = slotsByStart.get(slot.startAt);

    slotsByStart.set(
      slot.startAt,
      existing
        ? {
            startAt: slot.startAt,
            endAt: slot.endAt,
            available: existing.available && slot.available
          }
        : slot
    );
  }

  return Array.from(slotsByStart.values()).sort(
    (slotA, slotB) => new Date(slotA.startAt).getTime() - new Date(slotB.startAt).getTime()
  );
}

function getPendingPaymentHoldThreshold() {
  return new Date(Date.now() - PENDING_PAYMENT_HOLD_MS);
}

function getBlockingReservationStatusWhere() {
  return {
    OR: [
      { status: ReservationStatus.CONFIRMED },
      {
        status: ReservationStatus.PENDING_PAYMENT,
        createdAt: { gte: getPendingPaymentHoldThreshold() }
      }
    ]
  };
}

export async function releasePendingPaymentReservationsForUser(userId: string) {
  return prisma.reservation.deleteMany({
    where: {
      userId,
      status: ReservationStatus.PENDING_PAYMENT,
      payment: {
        is: {
          status: PaymentStatus.PENDING,
          externalId: null
        }
      }
    }
  });
}

export async function releaseExpiredPendingPaymentReservations() {
  return prisma.reservation.deleteMany({
    where: {
      status: ReservationStatus.PENDING_PAYMENT,
      createdAt: { lt: getPendingPaymentHoldThreshold() },
      payment: {
        is: {
          status: PaymentStatus.PENDING,
          externalId: null
        }
      }
    }
  });
}

export async function getAvailability(barberId: string, days = 14, startDate?: Date) {
  await releaseExpiredPendingPaymentReservations().catch(() => undefined);

  const barber = await prisma.barber
    .findUnique({
      where: { id: barberId },
      include: {
        availabilityRules: true,
        unavailableBlocks: true,
        reservations: {
          where: getBlockingReservationStatusWhere()
        }
      }
    })
    .catch(() => {
      const demoBarber = demoBarbers.find((barber) => barber.id === barberId) ?? demoBarbers[0];

      return {
        ...demoBarber,
        createdAt: new Date(),
        updatedAt: new Date(),
        availabilityRules: [
          { id: "demo-rule-1", barberId: demoBarber.id, weekday: 1, startTime: "13:00", endTime: "20:00", slotMinutes: TURN_SLOT_MINUTES },
          { id: "demo-rule-2", barberId: demoBarber.id, weekday: 2, startTime: "13:00", endTime: "20:00", slotMinutes: TURN_SLOT_MINUTES },
          { id: "demo-rule-3", barberId: demoBarber.id, weekday: 3, startTime: "13:00", endTime: "20:00", slotMinutes: TURN_SLOT_MINUTES },
          { id: "demo-rule-4", barberId: demoBarber.id, weekday: 4, startTime: "13:00", endTime: "20:00", slotMinutes: TURN_SLOT_MINUTES },
          { id: "demo-rule-5", barberId: demoBarber.id, weekday: 5, startTime: "13:00", endTime: "20:00", slotMinutes: TURN_SLOT_MINUTES },
          { id: "demo-rule-6", barberId: demoBarber.id, weekday: 6, startTime: "13:00", endTime: "20:00", slotMinutes: TURN_SLOT_MINUTES }
        ],
        unavailableBlocks: [],
        reservations: []
      };
    });

  if (!barber || !barber.active) return [];

  const now = new Date();
  const minBookableAt = new Date(now.getTime() + MIN_BOOKING_NOTICE_MS);
  const firstDay = startOfDay(startDate ?? now);

  return Array.from({ length: days }).map((_, index) => {
    const date = addDays(firstDay, index);
    const rules = barber.availabilityRules.filter((rule) => rule.weekday === date.getDay());
    const slots = rules.flatMap((rule) => {
      const result = [];
      let cursor = timeOnDate(date, rule.startTime);
      const dayEnd = timeOnDate(date, rule.endTime);

      while (cursor <= dayEnd) {
        const endAt = new Date(cursor.getTime() + TURN_SLOT_MS);
        if (endAt > new Date(dayEnd.getTime() + TURN_SLOT_MS)) break;

        const isBooked = barber.reservations.some((reservation) =>
          overlaps(cursor, endAt, reservation.startAt, reservation.endAt)
        );
        const isBlocked = barber.unavailableBlocks.some((block) =>
          overlaps(cursor, endAt, block.startAt, block.endAt)
        );
        const hasEnoughNotice = cursor >= minBookableAt;
        const available = !isBooked && !isBlocked && hasEnoughNotice;

        result.push({
          startAt: cursor.toISOString(),
          endAt: endAt.toISOString(),
          available
        });

        cursor = endAt;
      }

      return result;
    });

    return {
      date: format(date, "yyyy-MM-dd"),
      slots: dedupeSlots(slots)
    };
  });
}

export async function createUserReservation(input: {
  userId: string;
  barberId: string;
  startAt: Date;
  notes?: string;
  createdByAdmin?: boolean;
  status?: ReservationStatus;
}) {
  validateMinimumBookingNotice(input.startAt);

  const availability = await getAvailability(input.barberId, 1, startOfDay(input.startAt));
  const selected = availability
    .flatMap((day) => day.slots)
    .find((slot) => slot.startAt === input.startAt.toISOString() && slot.available);

  if (!selected) {
    throw new Error("El turno seleccionado ya no esta disponible");
  }

  const endAt = new Date(selected.endAt);
  await assertReservationSlotAvailable(input.barberId, input.startAt, endAt);
  const priceCents = await getHaircutPriceCents();

  return prisma.reservation.create({
    data: {
      userId: input.userId,
      barberId: input.barberId,
      startAt: input.startAt,
      endAt,
      notes: input.notes,
      createdByAdmin: input.createdByAdmin ?? false,
      status: input.status ?? ReservationStatus.PENDING_PAYMENT,
      priceCents,
      payment: {
        create: {
          amountCents: priceCents
        }
      }
    },
    include: {
      barber: true,
      user: true,
      payment: true
    }
  });
}

export async function assertReservationSlotAvailable(barberId: string, startAt: Date, endAt: Date, excludeReservationId?: string) {
  const conflict = await prisma.reservation.findFirst({
    where: {
      barberId,
      ...getBlockingReservationStatusWhere(),
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt }
    },
    select: { id: true }
  });

  if (conflict) {
    throw new Error("Ese turno ya esta reservado y no se puede volver a agendar");
  }
}

export function validateMinimumBookingNotice(startAt: Date) {
  const minBookableAt = new Date(Date.now() + MIN_BOOKING_NOTICE_MS);

  if (startAt < minBookableAt) {
    throw new Error("El turno debe reservarse con al menos 24 horas de anticipacion");
  }
}
