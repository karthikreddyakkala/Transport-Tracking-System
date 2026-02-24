import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeStops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body: { routeId, stopId, stopOrder, distanceFromPrev?, estimatedMinutesFromStart? }
    const [rs] = await db
      .insert(routeStops)
      .values({ id: nanoid(), ...body })
      .returning();
    return NextResponse.json(rs, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add stop to route" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const routeId = searchParams.get("routeId");
  const stopId = searchParams.get("stopId");
  if (!routeId || !stopId) {
    return NextResponse.json({ error: "routeId and stopId required" }, { status: 400 });
  }
  try {
    await db
      .delete(routeStops)
      .where(eq(routeStops.routeId, routeId));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Failed to remove stop" }, { status: 500 });
  }
}
