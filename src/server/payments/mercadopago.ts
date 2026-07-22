import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { getPublicAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { sendReservationConfirmation } from "@/server/email/send-confirmation";

const MP_API = "https://api.mercadopago.com";

export async function createMercadoPagoPreference(reservationId: string) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta MERCADO_PAGO_ACCESS_TOKEN");
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { barber: true, user: true, payment: true }
  });

  if (!reservation || !reservation.payment) {
    throw new Error("Reserva inexistente");
  }

  const appUrl = getPublicAppUrl();

  const response = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      external_reference: reservation.id,
      items: [
        {
          id: reservation.id,
          title: `Turno con ${reservation.barber.name}`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: reservation.priceCents / 100
        }
      ],
      payer: {
        name: reservation.user.name,
        email: reservation.user.email
      },
      back_urls: {
        success: `${appUrl}/pago/exito`,
        pending: `${appUrl}/pago/pendiente`,
        failure: `${appUrl}/pago/fallo`
      },
      notification_url: `${appUrl}/api/payments/webhook`,
      auto_return: "approved"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago rechazo la preferencia: ${body}`);
  }

  const preference = (await response.json()) as { id: string; init_point: string; sandbox_init_point?: string };

  await prisma.payment.update({
    where: { reservationId },
    data: { preferenceId: preference.id }
  });

  return preference;
}

export async function confirmMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Falta MERCADO_PAGO_ACCESS_TOKEN");

  const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error("No se pudo consultar el pago en Mercado Pago");
  }

  const payload = await response.json();
  const reservationId = payload.external_reference as string | undefined;
  if (!reservationId) return;

  const paymentStatus = payload.status === "approved" ? PaymentStatus.APPROVED : PaymentStatus.REJECTED;
  const reservationStatus =
    payload.status === "approved" ? ReservationStatus.CONFIRMED : ReservationStatus.PENDING_PAYMENT;

  const reservation = await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: reservationStatus,
      payment: {
        update: {
          externalId: String(payload.id),
          status: paymentStatus,
          rawPayload: payload
        }
      }
    },
    include: { barber: true, user: true, payment: true }
  });

  if (payload.status === "approved") {
    await sendReservationConfirmation(reservation);
  }
}
