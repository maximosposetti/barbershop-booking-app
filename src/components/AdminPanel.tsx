"use client";

import { Pencil, Save, Trash2, Upload } from "lucide-react";
import { FormEvent, useState } from "react";
import { AdminInsights } from "@/components/AdminInsights";

type Barber = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  active: boolean;
};

type Reservation = {
  id: string;
  startAt: string;
  status: string;
  barber: { name: string };
  user: { name: string | null; email: string };
};

type User = {
  id: string;
  name: string | null;
  email: string;
};

const reservationStatusOptions = [
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "PENDING_PAYMENT", label: "Pendiente" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "COMPLETED", label: "Finalizada" },
  { value: "NO_SHOW", label: "No show" }
];

function getMinimumReservationDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getBarberPayload(form: FormData) {
  return {
    name: form.get("name"),
    slug: form.get("slug"),
    description: form.get("description"),
    imageUrl: form.get("imageUrl"),
    active: form.get("active") === "true"
  };
}

function getApiErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as { error?: unknown }).error;

  if (typeof error === "string") return error;
  if (Array.isArray(error)) return error.join(" ");
  if (error && typeof error === "object") {
    const messages = Object.values(error)
      .flat()
      .filter((value): value is string => typeof value === "string");

    if (messages.length) return messages.join(" ");
  }

  return fallback;
}

export function AdminPanel({
  initialBarbers,
  initialReservations,
  initialUsers,
  databaseReady
}: {
  initialBarbers: Barber[];
  initialReservations: Reservation[];
  initialUsers: User[];
  databaseReady: boolean;
}) {
  const [barbers, setBarbers] = useState(initialBarbers);
  const [reservations, setReservations] = useState(initialReservations);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [reservationDraftStatuses, setReservationDraftStatuses] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const activeBarbers = barbers.filter((barber) => barber.active);
  const inactiveBarbers = barbers.filter((barber) => !barber.active);

  async function createBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const response = await fetch("/api/admin/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getBarberPayload(new FormData(formElement)))
    });

    if (response.ok) {
      const body = await response.json();
      setBarbers((current) => [body.barber, ...current]);
      formElement.reset();
      setMessage("Barbero creado.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo crear el barbero."));
    }
  }

  async function updateBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingBarber) return;

    const response = await fetch(`/api/admin/barbers/${editingBarber.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getBarberPayload(new FormData(event.currentTarget)))
    });

    if (response.ok) {
      const body = await response.json();
      setBarbers((current) => current.map((barber) => (barber.id === body.barber.id ? body.barber : barber)));
      setEditingBarber(null);
      setMessage("Barbero actualizado.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo actualizar el barbero."));
    }
  }

  async function deactivateBarber(barber: Barber) {
    const response = await fetch(`/api/admin/barbers/${barber.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...barber, active: false })
    });

    if (response.ok) {
      const body = await response.json();
      setBarbers((current) => current.map((currentBarber) => (currentBarber.id === body.barber.id ? body.barber : currentBarber)));
      if (editingBarber?.id === barber.id) setEditingBarber(body.barber);
      setMessage("Barbero dado de baja.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo dar de baja el barbero."));
    }
  }

  async function activateBarber(barber: Barber) {
    const response = await fetch(`/api/admin/barbers/${barber.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true })
    });

    if (response.ok) {
      const body = await response.json();
      setBarbers((current) => current.map((currentBarber) => (currentBarber.id === body.barber.id ? body.barber : currentBarber)));
      if (editingBarber?.id === barber.id) setEditingBarber(body.barber);
      setMessage("Barbero dado de alta.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo dar de alta el barbero."));
    }
  }

  async function deleteInactiveBarber(barber: Barber) {
    const confirmed = window.confirm("¿esta seguro que desea eliminar este barbero?");
    if (!confirmed) return;

    const response = await fetch(`/api/admin/barbers/${barber.id}`, { method: "DELETE" });
    if (response.ok) {
      setBarbers((current) => current.filter((currentBarber) => currentBarber.id !== barber.id));
      if (editingBarber?.id === barber.id) setEditingBarber(null);
      setMessage("Barbero eliminado definitivamente.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo eliminar el barbero."));
    }
  }

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId: form.get("barberId"),
        weekday: Number(form.get("weekday")),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
        slotMinutes: 30
      })
    });

    setMessage(response.ok ? "Horario configurado." : "No se pudo guardar el horario.");
    if (response.ok) formElement.reset();
  }

  async function blockSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "block",
        barberId: form.get("barberId"),
        startAt: form.get("startAt"),
        endAt: form.get("endAt"),
        reason: form.get("reason")
      })
    });

    setMessage(response.ok ? "Horario marcado como no disponible." : "No se pudo bloquear el horario.");
    if (response.ok) formElement.reset();
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const response = await fetch("/api/admin/gallery", {
      method: "POST",
      body: new FormData(formElement)
    });

    setMessage(response.ok ? "Foto cargada." : "No se pudo cargar la foto.");
    if (response.ok) formElement.reset();
  }

  async function createReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: form.get("userId"),
        barberId: form.get("barberId"),
        startAt: new Date(String(form.get("startAt"))).toISOString(),
        status: form.get("status")
      })
    });

    if (response.ok) {
      const body = await response.json();
      setReservations((current) => [body.reservation, ...current]);
      setMessage("Reserva creada.");
      formElement.reset();
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo crear la reserva."));
    }
  }

  async function saveReservationStatus(id: string) {
    const status = reservationDraftStatuses[id] ?? reservations.find((reservation) => reservation.id === id)?.status;
    if (!status) return;

    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      const body = await response.json();
      setReservations((current) => current.map((reservation) => (reservation.id === id ? body.reservation : reservation)));
      setReservationDraftStatuses((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setMessage("Reserva actualizada.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo actualizar la reserva."));
    }
  }

  return (
    <div className="admin-panel">
      <div className="section-title">
        <div>
          <h1>Panel administrador</h1>
          <p>Gestiona barberos, fotos, disponibilidad y reservas desde un solo lugar.</p>
        </div>
      </div>
      {!databaseReady ? (
        <div className="alert">
          Modo demo activo: no se pudo conectar con la base de datos. Podes navegar el panel, pero los cambios no se guardaran hasta
          corregir DATABASE_URL y ejecutar las migraciones.
        </div>
      ) : null}
      {message ? <div className="alert success">{message}</div> : null}

      {databaseReady ? <AdminInsights /> : null}

      <div className="admin-grid" style={{ marginTop: 20 }}>
        <section className="card">
          <div className="card-body">
            <h2>Crear barbero</h2>
            <form className="form" onSubmit={createBarber}>
              <input className="input" name="name" placeholder="Nombre" required />
              <input className="input" name="slug" placeholder="slug-ejemplo" required />
              <textarea className="input" name="description" placeholder="Descripcion breve" required />
              <input className="input" name="imageUrl" placeholder="URL de foto" required />
              <select className="input" name="active" defaultValue="true" required>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
              <button className="button" type="submit">
                <Save size={18} /> Crear barbero
              </button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h2>Editar barbero</h2>
            {editingBarber ? (
              <form className="form" key={editingBarber.id} onSubmit={updateBarber}>
                <input className="input" name="name" placeholder="Nombre" defaultValue={editingBarber.name} required />
                <input className="input" name="slug" placeholder="slug-ejemplo" defaultValue={editingBarber.slug} required />
                <textarea className="input" name="description" placeholder="Descripcion breve" defaultValue={editingBarber.description} required />
                <input className="input" name="imageUrl" placeholder="URL de foto" defaultValue={editingBarber.imageUrl} required />
                <select className="input" name="active" defaultValue={String(editingBarber.active)} required>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
                <button className="button" type="submit">
                  <Save size={18} /> Guardar cambios
                </button>
                <button className="button secondary" type="button" onClick={() => setEditingBarber(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <p>Selecciona un barbero del listado para editar sus datos.</p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h2>Horarios disponibles</h2>
            <form className="form" onSubmit={createRule}>
              <select className="input" name="barberId" required>
                <option value="">Barbero</option>
                {activeBarbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
              <select className="input" name="weekday" required>
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miercoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sabado</option>
              </select>
              <input className="input" name="startTime" type="time" step="1800" defaultValue="09:00" required />
              <input className="input" name="endTime" type="time" step="1800" defaultValue="18:00" required />
              <button className="button" type="submit">
                <Save size={18} /> Guardar horario
              </button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h2>Bloquear horario</h2>
            <form className="form" onSubmit={blockSlot}>
              <select className="input" name="barberId" required>
                <option value="">Barbero</option>
                {activeBarbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
              <input className="input" name="startAt" type="datetime-local" required />
              <input className="input" name="endAt" type="datetime-local" required />
              <input className="input" name="reason" placeholder="Motivo" />
              <button className="button danger" type="submit">
                Marcar no disponible
              </button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h2>Fotos</h2>
            <form className="form" onSubmit={uploadPhoto}>
              <input className="input" name="title" placeholder="Titulo" required />
              <select className="input" name="category" required>
                <option value="SHOP">Barberia</option>
                <option value="HAIRCUT">Cortes</option>
                <option value="BARBER">Barberos</option>
              </select>
              <input className="input" name="file" type="file" accept="image/*" required />
              <button className="button" type="submit">
                <Upload size={18} /> Cargar foto
              </button>
            </form>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-body">
          <h2>Barberos activos</h2>
          <div className="table-list">
            {activeBarbers.map((barber) => (
              <div className="row" key={barber.id}>
                <div>
                  <strong>{barber.name}</strong>
                  <div>{barber.slug}</div>
                </div>
                <button className="button secondary" type="button" onClick={() => setEditingBarber(barber)}>
                  <Pencil size={18} /> Editar
                </button>
                <button className="button danger" type="button" onClick={() => deactivateBarber(barber)}>
                  Dar de baja
                </button>
              </div>
            ))}
            {!activeBarbers.length ? <p>No hay barberos activos.</p> : null}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-body">
          <h2>Barberos inactivos</h2>
          <div className="table-list">
            {inactiveBarbers.map((barber) => (
              <div className="row" key={barber.id}>
                <div>
                  <strong>{barber.name}</strong>
                  <div>{barber.slug}</div>
                </div>
                <button className="button secondary" type="button" onClick={() => setEditingBarber(barber)}>
                  <Pencil size={18} /> Editar
                </button>
                <button className="button" type="button" onClick={() => activateBarber(barber)}>
                  Dar de alta
                </button>
                <button className="button danger" title="Eliminar definitivamente" type="button" onClick={() => deleteInactiveBarber(barber)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {!inactiveBarbers.length ? <p>No hay barberos inactivos.</p> : null}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-body">
          <h2>Crear reserva manual</h2>
          <form className="form" onSubmit={createReservation}>
            <select className="input" name="userId" required>
              <option value="">Usuario registrado</option>
              {initialUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ?? user.email} - {user.email}
                </option>
              ))}
            </select>
            <select className="input" name="barberId" required>
              <option value="">Barbero</option>
              {activeBarbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
            <input className="input" min={getMinimumReservationDateTime()} name="startAt" type="datetime-local" required />
            <select className="input" name="status" defaultValue="CONFIRMED">
              {reservationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="button" type="submit">
              Crear reserva
            </button>
          </form>
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-body">
          <h2>Reservas realizadas</h2>
          <div className="table-list">
            {reservations.map((reservation) => (
              <div className="row" key={reservation.id}>
                <div>
                  <strong>{reservation.user.name ?? reservation.user.email}</strong>
                  <div>{reservation.barber.name}</div>
                </div>
                <span>
                  {new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(reservation.startAt))} -{" "}
                  {reservation.status}
                </span>
                <select
                  className="input"
                  value={reservationDraftStatuses[reservation.id] ?? reservation.status}
                  onChange={(event) =>
                    setReservationDraftStatuses((current) => ({
                      ...current,
                      [reservation.id]: event.target.value
                    }))
                  }
                >
                  {reservationStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className="button" type="button" onClick={() => saveReservationStatus(reservation.id)}>
                  <Save size={18} /> Guardar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
