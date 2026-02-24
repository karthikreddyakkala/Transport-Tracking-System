import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routes } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const allRoutes = await db.query.routes.findMany({
      with: {
        routeStops: {
          with: { stop: true },
          orderBy: (rs, { asc }) => [asc(rs.stopOrder)],
        },
      },
    });
    return NextResponse.json(allRoutes);
  } catch {
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [route] = await db
      .insert(routes)
      .values({ id: nanoid(), ...body })
      .returning();
    return NextResponse.json(route, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create route" }, { status: 500 });
  }
}
