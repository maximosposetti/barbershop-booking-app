import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SLOT_MINUTES = 30;
const REVENUE_STATUSES: ReservationStatus[] = [ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED];
const OCCUPIED_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING_PAYMENT,
  ReservationStatus.CONFIRMED,
  ReservationStatus.COMPLETED,
  ReservationStatus.NO_SHOW
];

type PeriodKey = "today" | "7d" | "30d" | "year";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getRange(period: PeriodKey) {
  const now = new Date();
  const today = startOfDay(now);

  if (period === "today") return { from: today, to: endOfDay(now), bucket: "day" as const };
  if (period === "7d") return { from: addDays(today, -6), to: endOfDay(now), bucket: "day" as const };
  if (period === "30d") return { from: addDays(today, -29), to: endOfDay(now), bucket: "day" as const };

  return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now), bucket: "month" as const };
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatBucket(date: Date, bucket: "day" | "month") {
  return bucket === "month" ? formatMonthKey(date) : formatDateKey(date);
}

function getBuckets(from: Date, to: Date, bucket: "day" | "month") {
  const buckets: string[] = [];
  let cursor = bucket === "month" ? startOfMonth(from) : startOfDay(from);

  while (cursor <= to) {
    buckets.push(formatBucket(cursor, bucket));
    cursor = bucket === "month" ? addMonths(cursor, 1) : addDays(cursor, 1);
  }

  return buckets;
}

function centsToMoney(amountCents: number) {
  return Math.round(amountCents / 100);
}

function minutesBetween(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
}

function countRuleCapacityForRange(rule: { weekday: number; startTime: string; endTime: string }, from: Date, to: Date) {
  const slotsPerDay = Math.max(0, Math.floor(minutesBetween(rule.startTime, rule.endTime) / SLOT_MINUTES));
  let total = 0;
  let cursor = startOfDay(from);

  while (cursor <= to) {
    if (cursor.getDay() === rule.weekday) total += slotsPerDay;
    cursor = addDays(cursor, 1);
  }

  return total;
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export async function getBusinessAnalytics(period: PeriodKey = "30d") {
  const { from, to, bucket } = getRange(period);
  const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()) - 1);
  const previousTo = new Date(from.getTime() - 1);
  const monthStart = startOfMonth(new Date());

  const [
    reservations,
    previousReservations,
    monthReservations,
    users,
    barbers
  ] = await Promise.all([
    prisma.reservation.findMany({
      where: { startAt: { gte: from, lte: to } },
      include: {
        barber: { select: { id: true, name: true, availabilityRules: true } },
        user: { select: { id: true, name: true, email: true } },
        payment: { select: { status: true } }
      }
    }),
    prisma.reservation.findMany({ where: { startAt: { gte: previousFrom, lte: previousTo } } }),
    prisma.reservation.findMany({ where: { startAt: { gte: monthStart, lte: to } } }),
    prisma.user.findMany({
      where: { createdAt: { lte: to } },
      include: { reservations: { where: { startAt: { lte: to } } } }
    }),
    prisma.barber.findMany({
      where: { active: true },
      include: { availabilityRules: true }
    })
  ]);

  const buckets = getBuckets(from, to, bucket);
  const reservationsByPeriod = buckets.map((key) => ({
    label: key,
    value: reservations.filter((reservation) => formatBucket(reservation.startAt, bucket) === key).length
  }));
  const revenueByPeriod = buckets.map((key) => ({
    label: key,
    value: centsToMoney(
      reservations
        .filter((reservation) => formatBucket(reservation.startAt, bucket) === key && REVENUE_STATUSES.includes(reservation.status))
        .reduce((sum, reservation) => sum + reservation.priceCents, 0)
    )
  }));

  const totalReservations = reservations.length;
  const revenueCents = reservations
    .filter((reservation) => REVENUE_STATUSES.includes(reservation.status))
    .reduce((sum, reservation) => sum + reservation.priceCents, 0);
  const monthRevenueCents = monthReservations
    .filter((reservation) => REVENUE_STATUSES.includes(reservation.status))
    .reduce((sum, reservation) => sum + reservation.priceCents, 0);
  const newUsersThisMonth = users.filter((user) => user.createdAt >= monthStart).length;

  const reservationsByBarber = barbers.map((barber) => {
    const barberReservations = reservations.filter((reservation) => reservation.barberId === barber.id);
    const barberRevenueCents = barberReservations
      .filter((reservation) => REVENUE_STATUSES.includes(reservation.status))
      .reduce((sum, reservation) => sum + reservation.priceCents, 0);

    return {
      id: barber.id,
      name: barber.name,
      reservations: barberReservations.length,
      revenue: centsToMoney(barberRevenueCents),
      percentageOfTotal: percentage(barberReservations.length, totalReservations)
    };
  });

  const occupationByBarber = barbers.map((barber) => {
    const availableSlots = barber.availabilityRules.reduce((sum, rule) => sum + countRuleCapacityForRange(rule, from, to), 0);
    const reservedSlots = reservations.filter(
      (reservation) => reservation.barberId === barber.id && OCCUPIED_STATUSES.includes(reservation.status)
    ).length;

    return {
      id: barber.id,
      name: barber.name,
      availableSlots,
      reservedSlots,
      occupation: percentage(reservedSlots, availableSlots)
    };
  });

  const reservationsByHour = Array.from({ length: 24 }, (_, hour) => {
    const label = `${String(hour).padStart(2, "0")}:00`;
    return {
      label,
      value: reservations.filter((reservation) => reservation.startAt.getHours() === hour).length
    };
  }).filter((item) => item.value > 0);

  const reservationStatuses = Object.values(ReservationStatus).map((status) => ({
    status,
    value: reservations.filter((reservation) => reservation.status === status).length,
    percentage: percentage(reservations.filter((reservation) => reservation.status === status).length, totalReservations)
  }));

  const userMonthBuckets = getBuckets(new Date(new Date().getFullYear(), 0, 1), to, "month");
  const newUsersByMonth = userMonthBuckets.map((label) => ({
    label,
    value: users.filter((user) => formatMonthKey(user.createdAt) === label).length,
    active: users.filter((user) =>
      user.reservations.some((reservation) => formatMonthKey(reservation.startAt) === label)
    ).length
  }));

  const topCustomers = users
    .map((user) => {
      const userReservations = reservations.filter((reservation) => reservation.userId === user.id);
      const spentCents = userReservations
        .filter((reservation) => REVENUE_STATUSES.includes(reservation.status))
        .reduce((sum, reservation) => sum + reservation.priceCents, 0);
      const lastVisit = userReservations
        .map((reservation) => reservation.startAt)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        name: user.name ?? user.email,
        email: user.email,
        reservations: userReservations.length,
        spent: centsToMoney(spentCents),
        lastVisit: lastVisit ? lastVisit.toISOString() : null
      };
    })
    .filter((customer) => customer.reservations > 0)
    .sort((a, b) => b.reservations - a.reservations || b.spent - a.spent)
    .slice(0, 10);

  const cancellationsByDay = buckets.map((label) => ({
    label,
    value: reservations.filter((reservation) => formatBucket(reservation.startAt, bucket) === label && reservation.status === ReservationStatus.CANCELLED).length
  }));

  const noShows = reservations.filter((reservation) => reservation.status === ReservationStatus.NO_SHOW).length;
  const averageDaysUntilReservation =
    reservations.length === 0
      ? 0
      : Math.round(
          (reservations.reduce((sum, reservation) => sum + Math.max(0, reservation.startAt.getTime() - reservation.createdAt.getTime()), 0) /
            reservations.length /
            86_400_000) *
            10
        ) / 10;

  const heatmap = getBuckets(addDays(to, -83), to, "day").map((label) => ({
    date: label,
    value: reservations.filter((reservation) => formatDateKey(reservation.startAt) === label).length
  }));

  const previousTotal = previousReservations.length;
  const growthPercentage = previousTotal ? Math.round(((totalReservations - previousTotal) / previousTotal) * 100) : totalReservations ? 100 : 0;

  return {
    period,
    range: { from: from.toISOString(), to: to.toISOString() },
    kpis: {
      monthRevenue: centsToMoney(monthRevenueCents),
      monthReservations: monthReservations.length,
      newUsersThisMonth,
      averageOccupation: occupationByBarber.length
        ? Math.round(occupationByBarber.reduce((sum, barber) => sum + barber.occupation, 0) / occupationByBarber.length)
        : 0,
      totalReservations,
      revenue: centsToMoney(revenueCents),
      growthPercentage,
      noShows,
      averageDaysUntilReservation
    },
    reservationsByPeriod,
    revenueByPeriod,
    reservationsByBarber,
    occupationByBarber,
    reservationsByHour,
    reservationStatuses,
    newUsersByMonth,
    topCustomers,
    cancellationsByDay,
    heatmap
  };
}

export type BusinessAnalytics = Awaited<ReturnType<typeof getBusinessAnalytics>>;
