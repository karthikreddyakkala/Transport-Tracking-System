import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeRecommendations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const busId = searchParams.get("busId");

  try {
    const recs = await db.query.routeRecommendations.findMany({
      where: busId
        ? and(eq(routeRecommendations.busId, busId), eq(routeRecommendations.status, "pending"))
        : undefined,
      with: { },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
      limit: 20,
    });
    return NextResponse.json(recs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, busId } = await req.json();

    const [updated] = await db
      .update(routeRecommendations)
      .set({ status, respondedAt: new Date() })
      .where(eq(routeRecommendations.id, id))
      .returning();

    // Notify passengers if accepted
    if (status === "accepted" && busId) {
      await pusherServer.trigger(CHANNELS.BUS_TRACKING, EVENTS.PASSENGER_NOTIFICATION, {
        busId,
        message: "Route has been optimized by driver to avoid delays.",
        type: "route-change",
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 });
  }
}
