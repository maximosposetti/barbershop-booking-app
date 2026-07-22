"use client";

import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, Scissors } from "lucide-react";
import { useMemo, useState } from "react";

type Barber = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
};

type Slot = {
  startAt: string;
  endAt: string;
  available: boolean;
};

type DayAvailability = {
  date: string;
  slots: Slot[];
};

const weekdayLabels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const priceFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameMonth(dateA: Date, dateB: Date) {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

function getMonthDates(monthDate: Date) {
  const firstDay = startOfMonth(monthDate);

  return Array.from({ length: daysInMonth(firstDay) }, (_, index) => {
    return new Date(firstDay.getFullYear(), firstDay.getMonth(), index + 1);
  });
}

export function BookingFlow({ barbers, haircutPriceCents }: { barbers: Barber[]; haircutPriceCents: number }) {
  const today = startOfMonth(new Date());
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(barbers[0] ?? null);
  const [visibleMonth, setVisibleMonth] = useState(today);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAvailability(barber: Barber, monthDate = visibleMonth) {
    const monthStart = startOfMonth(monthDate);

    setSelectedBarber(barber);
    setSelectedDay(null);
    setSelectedSlot(null);
    setLoadingSlots(true);
    setMessage("");

    const params = new URLSearchParams({
      barberId: barber.id,
      start: toDateKey(monthStart),
      days: String(daysInMonth(monthStart))
    });
    const response = await fetch(`/api/availability?${params.toString()}`);
    const body = await response.json();
    setAvailability(body.availability ?? []);
    setLoadingSlots(false);
  }

  async function refreshAvailabilityAfterFailedPayment() {
    if (!selectedBarber) return;

    const monthStart = startOfMonth(visibleMonth);
    const params = new URLSearchParams({
      barberId: selectedBarber.id,
      start: toDateKey(monthStart),
      days: String(daysInMonth(monthStart))
    });
    const response = await fetch(`/api/availability?${params.toString()}`);
    const body = await response.json().catch(() => ({}));
    setAvailability(body.availability ?? []);
    setSelectedSlot(null);
  }

  async function changeMonth(amount: number) {
    const nextMonth = addMonths(visibleMonth, amount);
    setVisibleMonth(nextMonth);

    if (selectedBarber) {
      await loadAvailability(selectedBarber, nextMonth);
    }
  }

  async function payReservation() {
    if (!selectedBarber || !selectedSlot) return;
    setLoadingPayment(true);
    setMessage("");

    const reservationResponse = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId: selectedBarber.id,
        startAt: selectedSlot.startAt
      })
    });

    if (!reservationResponse.ok) {
      const body = await reservationResponse.json();
      setMessage(body.error ?? "No se pudo crear la reserva.");
      setLoadingPayment(false);
      return;
    }

    const { reservation } = await reservationResponse.json();
    const paymentResponse = await fetch("/api/payments/mercadopago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: reservation.id })
    });

    if (!paymentResponse.ok) {
      const body = await paymentResponse.json().catch(() => ({}));
      setMessage(
        body.detail
          ? `${body.error ?? "No se pudo iniciar Mercado Pago."} Detalle: ${body.detail}`
          : body.error ?? "No se pudo iniciar Mercado Pago. Revisa las variables de entorno."
      );
      await refreshAvailabilityAfterFailedPayment();
      setLoadingPayment(false);
      return;
    }

    const payment = await paymentResponse.json();
    window.location.href = payment.initPoint ?? payment.sandboxInitPoint;
  }

  const availabilityByDate = useMemo(() => {
    return new Map(availability.map((day) => [day.date, day]));
  }, [availability]);

  const monthDates = useMemo(() => getMonthDates(visibleMonth), [visibleMonth]);
  const leadingEmptyDays = monthDates[0] ? Array.from({ length: monthDates[0].getDay() }) : [];
  const selectedDayAvailability = selectedDay ? availabilityByDate.get(selectedDay) : null;
  const selectedDaySlots = selectedDayAvailability?.slots ?? [];
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(visibleMonth);
  const hasAvailabilityLoaded = availability.length > 0;
  const canGoPreviousMonth = !isSameMonth(visibleMonth, today);

  const selectedDate = useMemo(() => {
    if (!selectedSlot) return "Elegi un horario disponible";
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(selectedSlot.startAt));
  }, [selectedSlot]);

  const selectedDayLabel = useMemo(() => {
    if (!selectedDay) return "Selecciona un dia del mes";

    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date(`${selectedDay}T12:00:00`));
  }, [selectedDay]);

  return (
    <div className="booking-layout">
      <div className="booking-panel">
        <div className="section-title">
          <div>
            <h1>Agendar turno</h1>
            <p>Selecciona un barbero, elegi el dia del mes y despues el horario disponible.</p>
          </div>
        </div>

        <div className="grid-3">
          {barbers.map((barber) => (
            <button
              className="card barber-card"
              key={barber.id}
              onClick={() => loadAvailability(barber)}
              style={{ borderColor: selectedBarber?.id === barber.id ? "var(--gold)" : "var(--line)", cursor: "pointer", textAlign: "left" }}
              type="button"
            >
              <figure>
                <img src={barber.imageUrl} alt={barber.name} />
              </figure>
              <div className="card-body">
                <strong>{barber.name}</strong>
                <p>{barber.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="month-toolbar">
            <h2>
              <CalendarDays size={22} /> {monthLabel}
            </h2>
            <div className="month-actions">
              <button className="icon-button" disabled={!canGoPreviousMonth || loadingSlots} onClick={() => changeMonth(-1)} type="button" title="Mes anterior">
                <ChevronLeft size={18} />
              </button>
              <button className="icon-button" disabled={loadingSlots} onClick={() => changeMonth(1)} type="button" title="Mes siguiente">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {!selectedBarber ? <p>Elegi un barbero para ver disponibilidad.</p> : null}
          {loadingSlots ? <p>Cargando horarios...</p> : null}
          {!loadingSlots && !hasAvailabilityLoaded && selectedBarber ? (
            <button className="button secondary" type="button" onClick={() => loadAvailability(selectedBarber)}>
              Ver disponibilidad de {selectedBarber.name}
            </button>
          ) : null}

          {hasAvailabilityLoaded ? (
            <>
              <div className="month-grid">
                {weekdayLabels.map((weekday) => (
                  <span className="month-weekday" key={weekday}>
                    {weekday}
                  </span>
                ))}
                {leadingEmptyDays.map((_, index) => (
                  <span className="month-empty" key={`empty-${index}`} />
                ))}
                {monthDates.map((date) => {
                  const dateKey = toDateKey(date);
                  const day = availabilityByDate.get(dateKey);
                  const availableSlots = day?.slots.filter((slot) => slot.available).length ?? 0;
                  const totalSlots = day?.slots.length ?? 0;
                  const canSelectDay = availableSlots > 0;
                  const status = availableSlots > 0 ? `${availableSlots} libres` : totalSlots > 0 ? "Completo" : "Sin turnos";

                  return (
                    <button
                      className={`month-day ${canSelectDay ? "has-slots" : "disabled"} ${selectedDay === dateKey ? "is-selected" : ""}`}
                      disabled={!canSelectDay}
                      key={dateKey}
                      onClick={() => {
                        setSelectedDay(dateKey);
                        setSelectedSlot(null);
                      }}
                      type="button"
                    >
                      <span className="day-number">{date.getDate()}</span>
                      <span className="day-status">{status}</span>
                    </button>
                  );
                })}
              </div>

              <div className="day-slot-panel">
                <h3>{selectedDayLabel}</h3>
                <div className="slot-grid" style={{ marginTop: 10 }}>
                  {selectedDay ? (
                    selectedDaySlots.map((slot, slotIndex) => (
                      <button
                        className={`slot ${slot.available ? "available" : "unavailable"} ${selectedSlot?.startAt === slot.startAt ? "selected" : ""}`}
                        disabled={!slot.available}
                        key={`${slot.startAt}-${slot.endAt}-${slotIndex}`}
                        onClick={() => setSelectedSlot(slot)}
                        type="button"
                      >
                        {new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(slot.startAt))}
                      </button>
                    ))
                  ) : (
                    <p>Elegir un dia habilita los horarios disponibles.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <aside className="booking-panel summary">
        <h2>Resumen</h2>
        <p>
          <Scissors size={18} /> Barbero: <strong>{selectedBarber?.name ?? "Sin seleccionar"}</strong>
        </p>
        <p>
          <CalendarDays size={18} /> Turno: <strong>{selectedDate}</strong>
        </p>
        <p>
          <CreditCard size={18} /> Precio: <strong>{priceFormatter.format(haircutPriceCents / 100)}</strong>
        </p>
        <p>
          Se confirma automaticamente cuando Mercado Pago aprueba la transaccion. Los turnos requieren al menos 24 horas de anticipacion.
        </p>
        {message ? <div className="alert">{message}</div> : null}
        <button className="button gold" disabled={!selectedSlot || loadingPayment} onClick={payReservation} type="button">
          <CreditCard size={18} />
          {loadingPayment ? "Redirigiendo..." : "Pagar con Mercado Pago"}
        </button>
      </aside>
    </div>
  );
}
