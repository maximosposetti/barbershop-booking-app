import { NextResponse } from "next/server";
import { sendPendingReviewInvitations } from "@/server/reviews/service";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const result = await sendPendingReviewInvitations();
  return NextResponse.json(result);
}
