import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { getCurrentSession } from "@/lib/auth";
import { demoAdminUser, demoBarbers } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { DEFAULT_HAIRCUT_PRICE_CENTS, getBusinessSettings } from "@/server/settings/service";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { barbers, reservations, users, gallery, settings, reviews, databaseReady } = await Promise.all([
    prisma.barber.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.reservation.findMany({
      orderBy: { startAt: "asc" },
      include: {
        barber: { select: { name: true } },
        user: { select: { name: true, email: true } }
      }
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        city: true,
        addressStreet: true,
        addressNumber: true,
        addressFloor: true,
        addressApartment: true,
        createdAt: true
      }
    }),
    prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } }),
    getBusinessSettings(),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        barber: { select: { name: true } },
        user: { select: { name: true, email: true, phone: true, image: true } }
      }
    })
  ])
    .then(([barbers, reservations, users, gallery, settings, reviews]) => ({ barbers, reservations, users, gallery, settings, reviews, databaseReady: true }))
    .catch(() => {
      console.warn("No se pudo leer datos de admin desde la base. Se muestra modo demo.");
      return {
        barbers: demoBarbers,
        reservations: [],
        users: [
          {
            id: demoAdminUser.id,
            name: demoAdminUser.name,
            email: demoAdminUser.email,
            image: null,
            phone: null,
            city: null,
            addressStreet: null,
            addressNumber: null,
            addressFloor: null,
            addressApartment: null,
            createdAt: new Date()
          }
        ],
        gallery: [],
        settings: { haircutPriceCents: DEFAULT_HAIRCUT_PRICE_CENTS },
        reviews: [],
        databaseReady: false
      };
    });

  return (
    <main className="admin-page shell">
      <AdminPanel
        initialBarbers={barbers}
        initialReservations={reservations.map((reservation) => ({
          ...reservation,
          startAt: reservation.startAt instanceof Date ? reservation.startAt.toISOString() : reservation.startAt
        }))}
        initialUsers={users.map((user) => ({
          ...user,
          createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt
        }))}
        initialGallery={gallery.map((image) => ({
          id: image.id,
          title: image.title,
          url: image.url,
          category: image.category
        }))}
        initialSettings={{ haircutPriceCents: settings.haircutPriceCents }}
        initialReviews={reviews.map((review) => ({
          ...review,
          createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
          submittedAt: review.submittedAt instanceof Date ? review.submittedAt.toISOString() : review.submittedAt
        }))}
        databaseReady={databaseReady}
      />
    </main>
  );
}
