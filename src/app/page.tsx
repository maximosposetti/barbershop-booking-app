import type { Barber, GalleryImage, Review } from "@prisma/client";
import { MapPin, Star } from "lucide-react";
import Link from "next/link";
import { StyleAssistant } from "@/components/StyleAssistant";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReviewAverages } from "@/server/reviews/service";

const fallbackShopPhotos = [
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?auto=format&fit=crop&w=900&q=85"
];

const fallbackHaircuts = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1621605810052-80936545d164?auto=format&fit=crop&w=900&q=85"
];

const fallbackReviews = [
  { name: "Martin R.", rating: 5, comment: "Excelente atencion, puntuales y el corte quedo impecable." },
  { name: "Lucas P.", rating: 5, comment: "Muy facil reservar. Pague online y me llego la confirmacion al toque." },
  { name: "Santiago G.", rating: 4, comment: "Buen ambiente, buenos productos y barberos con mucha tecnica." }
];

type LandingReview = Review & {
  user: { name: string | null; email: string; image: string | null } | null;
  barber: { name: string } | null;
};

const fallbackBarbers = [
  {
    id: "demo-1",
    name: "Nico Alvarez",
    description: "Especialista en fades, barba y terminaciones con navaja.",
    imageUrl: "https://images.unsplash.com/photo-1622296089863-eb7fc530daa8?auto=format&fit=crop&w=900&q=85"
  },
  {
    id: "demo-2",
    name: "Tomas Vera",
    description: "Cortes clasicos, tijera y asesoria de estilo personalizada.",
    imageUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=900&q=85"
  }
];

export const dynamic = "force-dynamic";

async function getLandingData(): Promise<{
  barbers: Barber[];
  gallery: GalleryImage[];
  reviews: LandingReview[];
  reviewAverages: Awaited<ReturnType<typeof getReviewAverages>>;
}> {
  try {
    const [barbers, gallery, reviews, reviewAverages] = await Promise.all([
      prisma.barber.findMany({ where: { active: true }, take: 2, orderBy: { createdAt: "asc" } }),
      prisma.galleryImage.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
      prisma.review.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, image: true } },
          barber: { select: { name: true } }
        }
      }),
      getReviewAverages()
    ]);

    return { barbers, gallery, reviews, reviewAverages };
  } catch {
    console.warn("No se pudo leer la base de datos para la landing. Se muestran datos demo.");
    return { barbers: [], gallery: [], reviews: [], reviewAverages: { general: { average: 0, count: 0 }, byBarber: new Map() } };
  }
}

export default async function HomePage() {
  const session = await getCurrentSession().catch(() => null);
  const { barbers, gallery, reviews, reviewAverages } = await getLandingData();
  const bookingHref = session?.user ? "/agendar" : "/auth/login?callbackUrl=/agendar";
  const shopPhotos = gallery.filter((image) => image.category === "SHOP").map((image) => image.url);
  const haircutPhotos = gallery.filter((image) => image.category === "HAIRCUT").map((image) => image.url);
  const mapUrl = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL;
  const visibleReviews = reviews.length
    ? reviews.map((review) => ({
        id: review.id,
        name: review.user?.name ?? review.name,
        image: review.user?.image ?? "/default-pfp.jpg",
        barberName: review.barber?.name ?? null,
        rating: review.rating,
        comment: review.comment
      }))
    : fallbackReviews.map((review, index) => ({
        id: `fallback-${index}`,
        name: review.name,
        image: "/default-pfp.jpg",
        barberName: null,
        rating: review.rating,
        comment: review.comment
      }));

  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <h1>Barber Studio</h1>
          <p>Cortes clasicos, fades modernos y reservas online con pago seguro.</p>
          <Link className="button gold" href={bookingHref}>
            AGENDAR TURNO
          </Link>
        </div>
      </section>

      <section className="section" id="galeria">
        <div className="shell">
          <div className="section-title">
            <h2>La barberia</h2>
            <p>Un espacio comodo, preciso y pensado para que cada turno empiece a horario.</p>
          </div>
          <div className="photo-grid">
            {[...(shopPhotos.length ? shopPhotos : fallbackShopPhotos)].slice(0, 3).map((photo, index) => (
              <div className={`photo ${index === 0 ? "tall" : ""}`} key={photo}>
                <img src={photo} alt="Foto de la barberia" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="shell">
          <div className="section-title">
            <h2>Cortes</h2>
            <p>Galeria de trabajos para elegir referencia antes de sentarte en la silla.</p>
          </div>
          <div className="grid-3">
            {[...(haircutPhotos.length ? haircutPhotos : fallbackHaircuts)].slice(0, 3).map((photo) => (
              <div className="photo" key={photo}>
                <img src={photo} alt="Foto de corte de pelo" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="barberos">
        <div className="shell">
          <div className="section-title">
            <h2>Barberos</h2>
            <p>Elegi con quien atenderte antes de ver la agenda disponible.</p>
          </div>
          <div className="grid-3">
            {(barbers.length ? barbers : fallbackBarbers).map((barber) => (
              <article className="card barber-card" key={barber.id}>
                <figure>
                  <img src={barber.imageUrl} alt={barber.name} />
                </figure>
                <div className="card-body">
                  <h3>{barber.name}</h3>
                  <p>{barber.description}</p>
                  {"slug" in barber ? (
                    <div className="barber-rating">
                      <Star size={17} fill="currentColor" />
                      {reviewAverages.byBarber.get(barber.id)?.count
                        ? `${reviewAverages.byBarber.get(barber.id)?.average.toFixed(1)} (${reviewAverages.byBarber.get(barber.id)?.count} reseñas)`
                        : "Sin reseñas todavia"}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="shell">
          <div className="section-title">
            <h2>Clientes</h2>
            <p>Reservas simples, atencion puntual y resultados consistentes.</p>
            <div className="reviews-summary">
              <Star size={18} fill="currentColor" />
              {reviewAverages.general.count
                ? `${reviewAverages.general.average.toFixed(1)} promedio general de la barberia sobre ${reviewAverages.general.count} reseñas`
                : "Promedio general pendiente de reseñas reales"}
            </div>
          </div>
          <div className="grid-3">
            {visibleReviews.map((review) => (
              <article className="card" key={review.id}>
                <div className="card-body">
                  <div className="stars">
                    {Array.from({ length: review.rating }).map((_, index) => (
                      <Star key={index} size={18} fill="currentColor" />
                    ))}
                  </div>
                  <p>{review.comment}</p>
                  <div className="review-author">
                    <img src={review.image} alt={review.name} />
                    <div>
                      <strong>{review.name}</strong>
                      {review.barberName ? <span>Con {review.barberName}</span> : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="ubicacion">
        <div className="shell">
          <div className="section-title">
            <h2>Ubicacion</h2>
            <p>
              <MapPin size={18} /> Te esperamos en el local. Configura el mapa real desde las variables de entorno.
            </p>
          </div>
          <iframe className="map" loading="lazy" src={mapUrl} title="Ubicacion de la barberia" />
        </div>
      </section>
      {session?.user ? <StyleAssistant /> : null}
    </main>
  );
}
