import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { favoriteRoutes } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { routeId } = await req.json();
    const [fav] = await db
      .insert(favoriteRoutes)
      .values({ id: nanoid(), userId: session.user.id, routeId, createdAt: new Date() })
      .onConflictDoNothing()
      .returning();
    return NextResponse.json(fav ?? { ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { routeId } = await req.json();
    await db
      .delete(favoriteRoutes)
      .where(and(eq(favoriteRoutes.userId, session.user.id), eq(favoriteRoutes.routeId, routeId)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
