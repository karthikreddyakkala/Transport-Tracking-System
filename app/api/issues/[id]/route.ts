import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const [updated] = await db
      .update(issues)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}
