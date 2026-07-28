import { CalendarCheck, Scissors } from "lucide-react";
import { ReservationStatus } from "@prisma/client";
import type { UserReservationItem } from "@/server/reservations/user-reservations";

const statusLabels: Record<ReservationStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Efectuada",
  NO_SHOW: "Ausente"
};

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});
const upcomingStatuses: ReservationStatus[] = [ReservationStatus.PENDING_PAYMENT, ReservationStatus.CONFIRMED];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function groupReservations(reservations: UserReservationItem[]) {
  const now = Date.now();

  return {
    upcoming: reservations.filter(
      (reservation) =>
        new Date(reservation.startAt).getTime() >= now &&
        upcomingStatuses.includes(reservation.status)
    ),
    completed: reservations.filter(
      (reservation) =>
        reservation.status === ReservationStatus.COMPLETED ||
        (reservation.status === ReservationStatus.CONFIRMED && new Date(reservation.startAt).getTime() < now)
    ),
    cancelled: reservations.filter((reservation) => reservation.status === ReservationStatus.CANCELLED),
    other: reservations.filter((reservation) => {
      const isUpcoming =
        new Date(reservation.startAt).getTime() >= now &&
        upcomingStatuses.includes(reservation.status);
      const isCompleted =
        reservation.status === ReservationStatus.COMPLETED ||
        (reservation.status === ReservationStatus.CONFIRMED && new Date(reservation.startAt).getTime() < now);
      const isCancelled = reservation.status === ReservationStatus.CANCELLED;
      return !isUpcoming && !isCompleted && !isCancelled;
    })
  };
}

function ReservationList({ reservations }: { reservations: UserReservationItem[] }) {
  if (!reservations.length) {
    return <p className="muted-text">No hay reservas en esta categoria.</p>;
  }

  return (
    <div className="reservation-card-list">
      {reservations.map((reservation) => (
        <article className="reservation-card" key={reservation.id}>
          <div>
            <strong>
              <Scissors size={17} /> {reservation.barberName}
            </strong>
            <span>{formatDateTime(reservation.startAt)}</span>
          </div>
          <div>
            <span className={`reservation-status status-${reservation.status.toLowerCase().replace("_", "-")}`}>
              {statusLabels[reservation.status]}
            </span>
            <b>{moneyFormatter.format(reservation.priceCents / 100)}</b>
          </div>
        </article>
      ))}
    </div>
  );
}

export function UserReservations({ reservations }: { reservations: UserReservationItem[] }) {
  const groups = groupReservations(reservations);

  return (
    <section className="card user-reservations-section">
      <div className="card-body">
        <div className="section-title compact">
          <div>
            <h2>
              <CalendarCheck size={24} /> Mis reservas
            </h2>
            <p>Historial de reservas proximas, efectuadas y canceladas.</p>
          </div>
        </div>

        <div className="reservation-groups">
          <div>
            <h3>Proximas</h3>
            <ReservationList reservations={groups.upcoming} />
          </div>
          <div>
            <h3>Efectuadas</h3>
            <ReservationList reservations={groups.completed} />
          </div>
          <div>
            <h3>Canceladas</h3>
            <ReservationList reservations={groups.cancelled} />
          </div>
          {groups.other.length ? (
            <div>
              <h3>Otras reservas</h3>
              <ReservationList reservations={groups.other} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
