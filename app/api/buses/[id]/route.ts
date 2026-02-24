import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const bus = await db.query.buses.findFirst({
      where: eq(buses.id, id),
      with: { route: { with: { routeStops: { with: { stop: true }, orderBy: (rs, { asc }) => [asc(rs.stopOrder)] } } }, location: true, driver: { columns: { id: true, name: true } } },
    });
    if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    return NextResponse.json(bus);
  } catch {
    return NextResponse.json({ error: "Failed to fetch bus" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const [updated] = await db
      .update(buses)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(buses.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update bus" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.delete(buses).where(eq(buses.id, id));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Failed to delete bus" }, { status: 500 });
  }
}
