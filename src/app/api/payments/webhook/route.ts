import { NextResponse } from "next/server";
import { confirmMercadoPagoPayment } from "@/server/payments/mercadopago";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const paymentId = body?.data?.id ?? body?.id;

  if (paymentId) {
    await confirmMercadoPagoPayment(String(paymentId));
  }

  return NextResponse.json({ received: true });
}
