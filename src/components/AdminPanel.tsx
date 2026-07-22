"use client";

import { BarChart3, CalendarClock, Camera, DollarSign, Home, Images, LogOut, MapPin, Pencil, Save, Scissors, Trash2, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useState } from "react";
import { AdminInsights } from "@/components/AdminInsights";

type AdminSection = "charts" | "barbers" | "schedule" | "photos" | "settings";

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

type GalleryImage = {
  id: string;
  title: string;
  url: string;
  category: string;
};

type BusinessSettings = {
  haircutPriceCents: number;
};

const reservationStatusOptions = [
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "PENDING_PAYMENT", label: "Pendiente" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "COMPLETED", label: "Finalizada" },
  { value: "NO_SHOW", label: "Ausente" }
];

const galleryCategoryOptions = [
  { value: "SHOP", label: "Barberia" },
  { value: "HAIRCUT", label: "Cortes" },
  { value: "BARBER", label: "Barberos" }
];

const adminSections: { id: AdminSection; label: string; icon: ReactNode }[] = [
  { id: "charts", label: "Graficos", icon: <BarChart3 size={18} /> },
  { id: "barbers", label: "Barberos", icon: <Scissors size={18} /> },
  { id: "schedule", label: "Horarios", icon: <CalendarClock size={18} /> },
  { id: "photos", label: "Fotos", icon: <Camera size={18} /> },
  { id: "settings", label: "Precio", icon: <DollarSign size={18} /> }
];

const priceFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

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
  initialGallery,
  initialSettings,
  databaseReady
}: {
  initialBarbers: Barber[];
  initialReservations: Reservation[];
  initialUsers: User[];
  initialGallery: GalleryImage[];
  initialSettings: BusinessSettings;
  databaseReady: boolean;
}) {
  const [activeSection, setActiveSection] = useState<AdminSection>("charts");
  const [barbers, setBarbers] = useState(initialBarbers);
  const [reservations, setReservations] = useState(initialReservations);
  const [gallery, setGallery] = useState(initialGallery);
  const [settings, setSettings] = useState(initialSettings);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<GalleryImage | null>(null);
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

    if (response.ok) {
      const body = await response.json();
      setGallery((current) => [body.image, ...current]);
      formElement.reset();
      setMessage("Foto cargada.");
    } else {
      setMessage("No se pudo cargar la foto.");
    }
  }

  async function updatePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPhoto) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/gallery/${editingPhoto.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        category: form.get("category"),
        url: form.get("url")
      })
    });

    if (response.ok) {
      const body = await response.json();
      setGallery((current) => current.map((image) => (image.id === body.image.id ? body.image : image)));
      setEditingPhoto(null);
      setMessage("Foto actualizada.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo actualizar la foto."));
    }
  }

  async function deletePhoto(photo: GalleryImage) {
    const confirmed = window.confirm("¿esta seguro que desea eliminar esta foto?");
    if (!confirmed) return;
    const response = await fetch(`/api/admin/gallery/${photo.id}`, { method: "DELETE" });

    if (response.ok) {
      setGallery((current) => current.filter((image) => image.id !== photo.id));
      if (editingPhoto?.id === photo.id) setEditingPhoto(null);
      setMessage("Foto eliminada.");
    } else {
      setMessage("No se pudo eliminar la foto.");
    }
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

  async function updateBusinessSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const pricePesos = Number(form.get("haircutPrice"));

    if (!Number.isFinite(pricePesos) || pricePesos <= 0) {
      setMessage("Ingresa un precio valido.");
      return;
    }

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ haircutPriceCents: Math.round(pricePesos * 100) })
    });

    if (response.ok) {
      const body = await response.json();
      setSettings(body.settings);
      setMessage("Precio actualizado.");
    } else {
      const body = await response.json().catch(() => ({}));
      setMessage(getApiErrorMessage(body, "No se pudo actualizar el precio."));
    }
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link className="brand admin-sidebar-brand" href="/">
          <span className="brand-mark">
            <Scissors size={21} />
          </span>
          Barber Studio
        </Link>
        <nav className="admin-sidebar-nav" aria-label="Navegacion principal">
          <Link href="/">
            <Home size={18} /> Inicio
          </Link>
          <Link href="/#barberos">
            <Scissors size={18} /> Barberos landing
          </Link>
          <Link href="/#galeria">
            <Images size={18} /> Galería
          </Link>
          <Link href="/#ubicacion">
            <MapPin size={18} /> Ubicación
          </Link>
          <Link href="/perfil">
            <UserRound size={18} /> Mi perfil
          </Link>
          <Link href="/agendar">
            <CalendarClock size={18} /> Agendar turno
          </Link>
          <Link href="/auth/logout">
            <LogOut size={18} /> Salir
          </Link>
        </nav>
        <div className="admin-sidebar-divider" />
        <nav className="admin-sidebar-nav" aria-label="Secciones del panel">
          {adminSections.map((section) => (
            <button
              className={activeSection === section.id ? "is-active" : ""}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-dashboard-main">
        <div className="section-title">
          <div>
            <h1>Panel administrador</h1>
            <p>Gestiona graficos, barberos, horarios y fotos desde secciones separadas.</p>
          </div>
        </div>
        {!databaseReady ? (
          <div className="alert">
            Modo demo activo: no se pudo conectar con la base de datos. Podes navegar el panel, pero los cambios no se guardaran hasta
            corregir DATABASE_URL y ejecutar las migraciones.
          </div>
        ) : null}
        {message ? <div className="alert success">{message}</div> : null}

        {activeSection === "charts" && (databaseReady ? <AdminInsights /> : <div className="card"><div className="card-body">Los graficos necesitan la base de datos conectada.</div></div>)}

        {activeSection === "barbers" ? (
          <div className="admin-section-stack">
            <div className="admin-grid">
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
            </div>

            <section className="card">
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

            <section className="card">
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
          </div>
        ) : null}

        {activeSection === "schedule" ? (
          <div className="admin-section-stack">
            <div className="admin-grid">
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
            </div>

            <section className="card">
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

            <section className="card">
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
        ) : null}

        {activeSection === "photos" ? (
          <div className="admin-section-stack">
            <div className="admin-grid">
              <section className="card">
                <div className="card-body">
                  <h2>Cargar foto</h2>
                  <form className="form" onSubmit={uploadPhoto}>
                    <input className="input" name="title" placeholder="Titulo" required />
                    <select className="input" name="category" required>
                      {galleryCategoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input className="input" name="file" type="file" accept="image/*" required />
                    <button className="button" type="submit">
                      <Upload size={18} /> Cargar foto
                    </button>
                  </form>
                </div>
              </section>

              <section className="card">
                <div className="card-body">
                  <h2>Editar foto</h2>
                  {editingPhoto ? (
                    <form className="form" key={editingPhoto.id} onSubmit={updatePhoto}>
                      <input className="input" name="title" placeholder="Titulo" defaultValue={editingPhoto.title} required />
                      <select className="input" name="category" defaultValue={editingPhoto.category} required>
                        {galleryCategoryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input className="input" name="url" placeholder="URL" defaultValue={editingPhoto.url} required />
                      <button className="button" type="submit">
                        <Save size={18} /> Guardar cambios
                      </button>
                      <button className="button secondary" type="button" onClick={() => setEditingPhoto(null)}>
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <p>Selecciona una foto del listado para editarla.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="card">
              <div className="card-body">
                <h2>Fotos publicadas</h2>
                <div className="photo-admin-grid">
                  {gallery.map((photo) => (
                    <article className="photo-admin-item" key={photo.id}>
                      <img src={photo.url} alt={photo.title} />
                      <div>
                        <strong>{photo.title}</strong>
                        <span>{photo.category}</span>
                      </div>
                      <button className="button secondary" type="button" onClick={() => setEditingPhoto(photo)}>
                        <Pencil size={18} /> Editar
                      </button>
                      <button className="button danger" type="button" onClick={() => deletePhoto(photo)}>
                        <Trash2 size={18} />
                      </button>
                    </article>
                  ))}
                  {!gallery.length ? <p>No hay fotos cargadas.</p> : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activeSection === "settings" ? (
          <div className="admin-section-stack">
            <section className="card">
              <div className="card-body">
                <h2>Precio del corte</h2>
                <p>Precio actual: <strong>{priceFormatter.format(settings.haircutPriceCents / 100)}</strong></p>
                <form className="form" onSubmit={updateBusinessSettings}>
                  <input
                    className="input"
                    defaultValue={settings.haircutPriceCents / 100}
                    min="1"
                    name="haircutPrice"
                    step="100"
                    type="number"
                    required
                  />
                  <button className="button" type="submit">
                    <Save size={18} /> Guardar precio
                  </button>
                </form>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
