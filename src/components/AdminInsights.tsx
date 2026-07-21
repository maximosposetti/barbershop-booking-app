"use client";

import { Bot, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Point = {
  label: string;
  value: number;
};

type BarberMetric = {
  id: string;
  name: string;
  reservations: number;
  revenue: number;
  percentageOfTotal: number;
};

type OccupationMetric = {
  id: string;
  name: string;
  availableSlots: number;
  reservedSlots: number;
  occupation: number;
};

type StatusMetric = {
  status: string;
  value: number;
  percentage: number;
};

type UserMonthMetric = {
  label: string;
  value: number;
  active: number;
};

type CustomerMetric = {
  name: string;
  email: string;
  reservations: number;
  spent: number;
  lastVisit: string | null;
};

type Analytics = {
  period: string;
  kpis: {
    monthRevenue: number;
    monthReservations: number;
    newUsersThisMonth: number;
    averageOccupation: number;
    totalReservations: number;
    revenue: number;
    growthPercentage: number;
    noShows: number;
    averageDaysUntilReservation: number;
  };
  reservationsByPeriod: Point[];
  revenueByPeriod: Point[];
  reservationsByBarber: BarberMetric[];
  occupationByBarber: OccupationMetric[];
  reservationsByHour: Point[];
  reservationStatuses: StatusMetric[];
  newUsersByMonth: UserMonthMetric[];
  topCustomers: CustomerMetric[];
  cancellationsByDay: Point[];
  heatmap: Point[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const periods = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "year", label: "Este ano" }
];

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pendientes",
  CONFIRMED: "Confirmadas",
  CANCELLED: "Canceladas",
  COMPLETED: "Finalizadas",
  NO_SHOW: "No shows"
};

function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(value));
}

function maxValue(points: Point[]) {
  return Math.max(1, ...points.map((point) => point.value));
}

function LineChart({ points, moneyValues = false }: { points: Point[]; moneyValues?: boolean }) {
  const max = maxValue(points);
  const polyline = points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 92 - (point.value / max) * 78;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={polyline} />
      </svg>
      <div className="chart-axis">
        {points.slice(0, 6).map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
      <strong>{moneyValues ? money(max) : max}</strong>
    </div>
  );
}

function BarList({ points, moneyValues = false }: { points: Point[]; moneyValues?: boolean }) {
  const max = maxValue(points);

  return (
    <div className="bar-list">
      {points.map((point) => (
        <div className="metric-bar" key={point.label}>
          <span>{point.label}</span>
          <div>
            <i style={{ width: `${Math.max(4, (point.value / max) * 100)}%` }} />
          </div>
          <strong>{moneyValues ? money(point.value) : point.value}</strong>
        </div>
      ))}
      {!points.length ? <p>Sin datos en este periodo.</p> : null}
    </div>
  );
}

function Heatmap({ points }: { points: Point[] }) {
  const max = maxValue(points);

  return (
    <div className="heatmap">
      {points.map((point) => {
        const level = point.value === 0 ? 0 : Math.ceil((point.value / max) * 4);
        return <span className={`heat-level-${level}`} key={point.label} title={`${point.label}: ${point.value}`} />;
      })}
    </div>
  );
}

export function AdminInsights() {
  const [period, setPeriod] = useState("30d");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Puedo responder sobre ingresos, reservas, ocupacion, horarios elegidos, clientes, cancelaciones y crecimiento."
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/admin/analytics?period=${period}`)
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setAnalytics(body.analytics ?? null);
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const statusSegments = useMemo(() => {
    if (!analytics) return "";
    const colors = ["#c49132", "#1f8f52", "#c93b35", "#4c6fff", "#111111"];
    let current = 0;

    return analytics.reservationStatuses
      .map((status, index) => {
        const next = current + status.percentage;
        const segment = `${colors[index % colors.length]} ${current}% ${next}%`;
        current = next;
        return segment;
      })
      .join(", ");
  }, [analytics]);

  async function askAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question.trim();
    setQuestion("");
    setChat((current) => [...current, { role: "user", content: currentQuestion }]);
    setChatLoading(true);

    const response = await fetch("/api/admin/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: currentQuestion, period })
    });
    const body = await response.json().catch(() => ({}));

    setChat((current) => [
      ...current,
      {
        role: "assistant",
        content: response.ok ? body.answer : body.error ?? "No se pudo consultar la IA."
      }
    ]);
    setChatLoading(false);
  }

  return (
    <section className="analytics-shell">
      <div className="section-title">
        <div>
          <h2>Analitica del negocio</h2>
          <p>Metricas comerciales, ocupacion y consultas con IA para administradores.</p>
        </div>
        <select className="input period-select" value={period} onChange={(event) => setPeriod(event.target.value)}>
          {periods.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? <div className="card"><div className="card-body">Cargando metricas...</div></div> : null}

      {analytics ? (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span>Ingresos del mes</span>
              <strong>{money(analytics.kpis.monthRevenue)}</strong>
            </div>
            <div className="kpi-card">
              <span>Reservas del mes</span>
              <strong>{analytics.kpis.monthReservations}</strong>
            </div>
            <div className="kpi-card">
              <span>Clientes nuevos</span>
              <strong>{analytics.kpis.newUsersThisMonth}</strong>
            </div>
            <div className="kpi-card">
              <span>Ocupacion promedio</span>
              <strong>{analytics.kpis.averageOccupation}%</strong>
            </div>
          </div>

          <div className="analytics-grid two">
            <article className="card">
              <div className="card-body">
                <h3>Reservas por periodo</h3>
                <LineChart points={analytics.reservationsByPeriod} />
                <p>Variacion contra periodo anterior: {analytics.kpis.growthPercentage}%</p>
              </div>
            </article>
            <article className="card">
              <div className="card-body">
                <h3>Ingresos por periodo</h3>
                <LineChart moneyValues points={analytics.revenueByPeriod} />
                <p>Total del periodo: {money(analytics.kpis.revenue)}</p>
              </div>
            </article>
          </div>

          <div className="analytics-grid two">
            <article className="card">
              <div className="card-body">
                <h3>Reservas por barbero</h3>
                <div className="bar-list">
                  {analytics.reservationsByBarber.map((barber) => (
                    <div className="metric-bar" key={barber.id}>
                      <span>{barber.name}</span>
                      <div>
                        <i style={{ width: `${Math.max(4, barber.percentageOfTotal)}%` }} />
                      </div>
                      <strong>{barber.reservations} / {money(barber.revenue)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </article>
            <article className="card">
              <div className="card-body">
                <h3>Ocupacion por barbero</h3>
                <div className="occupation-list">
                  {analytics.occupationByBarber.map((barber) => (
                    <div key={barber.id}>
                      <div>
                        <strong>{barber.name}</strong>
                        <span>{barber.reservedSlots}/{barber.availableSlots} turnos</span>
                      </div>
                      <progress max="100" value={barber.occupation} />
                      <b>{barber.occupation}%</b>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>

          <div className="analytics-grid three">
            <article className="card">
              <div className="card-body">
                <h3>Horarios mas elegidos</h3>
                <BarList points={analytics.reservationsByHour} />
              </div>
            </article>
            <article className="card">
              <div className="card-body">
                <h3>Estado de reservas</h3>
                <div className="donut" style={{ background: `conic-gradient(${statusSegments || "#eee8df 0% 100%"})` }} />
                <div className="legend-list">
                  {analytics.reservationStatuses.map((item) => (
                    <span key={item.status}>{statusLabels[item.status] ?? item.status}: {item.percentage}%</span>
                  ))}
                </div>
              </div>
            </article>
            <article className="card">
              <div className="card-body">
                <h3>Clientes nuevos vs activos</h3>
                <BarList points={analytics.newUsersByMonth.map((item) => ({ label: item.label, value: item.value }))} />
              </div>
            </article>
          </div>

          <div className="analytics-grid three">
            <article className="card">
              <div className="card-body">
                <h3>Cancelaciones por dia</h3>
                <BarList points={analytics.cancellationsByDay.filter((item) => item.value > 0)} />
              </div>
            </article>
            <article className="card">
              <div className="card-body">
                <h3>No shows</h3>
                <div className="large-number">{analytics.kpis.noShows}</div>
              </div>
            </article>
            <article className="card">
              <div className="card-body">
                <h3>Tiempo promedio hasta reservar</h3>
                <div className="large-number">{analytics.kpis.averageDaysUntilReservation} dias</div>
              </div>
            </article>
          </div>

          <article className="card" style={{ marginTop: 20 }}>
            <div className="card-body">
              <h3>Top 10 clientes</h3>
              <div className="analytics-table">
                <span>Nombre</span>
                <span>Reservas</span>
                <span>Gastado</span>
                <span>Ultima visita</span>
                {analytics.topCustomers.map((customer) => (
                  <div className="analytics-row" key={customer.email}>
                    <span>{customer.name}</span>
                    <span>{customer.reservations}</span>
                    <span>{money(customer.spent)}</span>
                    <span>{formatDate(customer.lastVisit)}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="card" style={{ marginTop: 20 }}>
            <div className="card-body">
              <h3>Heatmap de reservas</h3>
              <Heatmap points={analytics.heatmap} />
            </div>
          </article>

          <article className="card ai-card" style={{ marginTop: 20 }}>
            <div className="card-body">
              <h3>
                <Bot size={20} /> Chat IA del negocio
              </h3>
              <div className="ai-chat-log">
                {chat.map((message, index) => (
                  <div className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
                    {message.content}
                  </div>
                ))}
                {chatLoading ? <div className="ai-message assistant">Analizando datos...</div> : null}
              </div>
              <form className="ai-chat-form" onSubmit={askAi}>
                <input
                  className="input"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Pregunta por ingresos, ocupacion, clientes o cancelaciones"
                />
                <button className="button" disabled={chatLoading} type="submit">
                  <Send size={18} /> Preguntar
                </button>
              </form>
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
