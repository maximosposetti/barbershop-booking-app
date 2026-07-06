import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="auth-page shell">
      <div className="auth-panel">
        <h1>Pago aprobado</h1>
        <p>Mercado Pago confirmó la transacción. En instantes recibirás el email de confirmación.</p>
        <Link className="button" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
