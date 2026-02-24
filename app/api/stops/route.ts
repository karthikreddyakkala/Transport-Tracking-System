import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { busStops } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const stops = await db.query.busStops.findMany({
      with: { routeStops: { with: { route: true } } },
    });
    return NextResponse.json(stops);
  } catch {
    return NextResponse.json({ error: "Failed to fetch stops" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [stop] = await db
      .insert(busStops)
      .values({ id: nanoid(), ...body })
      .returning();
    return NextResponse.json(stop, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create stop" }, { status: 500 });
  }
}
