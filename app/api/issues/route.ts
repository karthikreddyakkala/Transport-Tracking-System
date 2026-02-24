import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { pusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const allIssues = await db.query.issues.findMany({
      with: {
        stop: { columns: { id: true, name: true } },
        bus: { columns: { id: true, number: true } },
      },
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    });
    return NextResponse.json(allIssues);
  } catch {
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  try {
    const body = await req.json();
    const [issue] = await db
      .insert(issues)
      .values({
        id: nanoid(),
        reportedById: session?.user?.id,
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Notify admins
    await pusherServer.trigger(CHANNELS.admin, EVENTS.NEW_ISSUE, {
      issue,
    });

    return NextResponse.json(issue, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
