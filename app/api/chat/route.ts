import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatMessages, buses, favoriteRoutes, etaPredictions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateChatResponse } from "@/lib/gemini";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  try {
    const { message, userId: guestUserId } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const userId = session?.user?.id ?? guestUserId;

    // Gather real-time context
    const [activeBuses, userFavorites] = await Promise.all([
      db.query.buses.findMany({
        where: eq(buses.status, "active"),
        with: { location: true, route: true },
        limit: 10,
      }),
      userId
        ? db.query.favoriteRoutes.findMany({
            where: eq(favoriteRoutes.userId, userId),
            with: { route: true },
          })
        : Promise.resolve([]),
    ]);

    const contextData = {
      buses: activeBuses.map((b) => ({
        number: b.number,
        routeName: b.route?.name ?? "Unknown",
        speed: b.location?.speed ?? 0,
        nextStop: b.location?.nextStopId ?? "Unknown",
      })),
      favoriteRoutes: userFavorites.map((f) => (f as any).route?.name ?? ""),
      userRole: session?.user ? (session.user as { role?: string }).role ?? "passenger" : "guest",
    };

    const aiResponse = await generateChatResponse(message, contextData);

    // Store if authenticated
    if (userId) {
      await db.insert(chatMessages).values({
        id: nanoid(),
        userId,
        userMessage: message,
        aiResponse,
        contextData,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const history = await db.query.chatMessages.findMany({
      where: eq(chatMessages.userId, session.user.id),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      limit: 50,
    });
    return NextResponse.json(history);
  } catch {
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}
