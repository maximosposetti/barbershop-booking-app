import Link from "next/link";

export default function PaymentFailurePage() {
  return (
    <main className="auth-page shell">
      <div className="auth-panel">
        <h1>No se aprobó el pago</h1>
        <p>Podés volver a elegir el horario e intentar nuevamente.</p>
        <Link className="button" href="/agendar">
          Intentar de nuevo
        </Link>
      </div>
    </main>
  );
}
