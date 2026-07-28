import { NextResponse } from "next/server";
import { reviewSubmissionSchema } from "@/lib/validators";
import { submitReservationReview } from "@/server/reviews/service";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = await request.json();
  const parsed = reviewSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const review = await submitReservationReview({
      token,
      rating: parsed.data.rating,
      comment: parsed.data.comment
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar la reseña." },
      { status: 400 }
    );
  }
}
