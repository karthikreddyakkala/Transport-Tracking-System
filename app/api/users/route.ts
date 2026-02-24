import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  try {
    const result = await db.query.users.findMany({
      where: role ? eq(users.role, role as "passenger" | "driver" | "admin") : undefined,
      columns: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
