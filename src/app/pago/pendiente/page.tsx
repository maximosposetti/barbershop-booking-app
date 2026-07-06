import Link from "next/link";

export default function PaymentPendingPage() {
  return (
    <main className="auth-page shell">
      <div className="auth-panel">
        <h1>Pago pendiente</h1>
        <p>La reserva se confirmará cuando Mercado Pago apruebe la operación.</p>
        <Link className="button" href="/agendar">
          Ver turnos
        </Link>
      </div>
    </main>
  );
}
