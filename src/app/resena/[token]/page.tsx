import { CheckCircle2, Scissors, Star } from "lucide-react";
import Link from "next/link";
import { ReviewSubmissionForm } from "@/components/ReviewSubmissionForm";
import { getReviewInvitationByToken } from "@/server/reviews/service";

type PageProps = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: PageProps) {
  const { token } = await params;
  const invitation = await getReviewInvitationByToken(token).catch(() => null);

  if (!invitation) {
    return (
      <main className="auth-page shell">
        <section className="auth-panel review-page-panel">
          <h1>Enlace no valido</h1>
          <p>Este enlace de reseña no existe o ya no esta disponible.</p>
          <Link className="button gold" href="/">
            Volver al inicio
          </Link>
        </section>
      </main>
    );
  }

  const reservation = invitation.reservation;
  const alreadyReviewed = invitation.usedAt || reservation.review;
  const date = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(reservation.startAt);

  return (
    <main className="auth-page shell">
      <section className="auth-panel review-page-panel">
        <div className="review-page-heading">
          <span className="brand-mark">
            <Scissors size={21} />
          </span>
          <div>
            <h1>Dejar reseña</h1>
            <p>Tu opinion ayuda a mejorar Barber Studio.</p>
          </div>
        </div>

        <div className="review-reservation-summary">
          <img src={reservation.barber.imageUrl} alt={reservation.barber.name} />
          <div>
            <strong>{reservation.barber.name}</strong>
            <span>{date}</span>
          </div>
        </div>

        {alreadyReviewed ? (
          <div className="alert success">
            <CheckCircle2 size={18} /> Esta reseña ya fue enviada. Muchas gracias por tu tiempo.
          </div>
        ) : (
          <>
            <div className="review-stars-note">
              <Star size={18} fill="currentColor" /> Califica tu experiencia con este barbero.
            </div>
            <ReviewSubmissionForm token={token} />
          </>
        )}
      </section>
    </main>
  );
}
