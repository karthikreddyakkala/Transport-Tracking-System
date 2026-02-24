import { NextResponse } from "next/server";
import { Client } from "@upstash/qstash";

/**
 * POST /api/simulator/schedule
 * Registers (or updates) a QStash cron schedule that hits /api/simulator every minute.
 * Call this once from the admin dashboard when deploying to production.
 *
 * QStash minimum cron interval: 1 minute ("* * * * *")
 * For more frequent updates (5s) in production, use the chained-message pattern instead.
 */
export async function POST() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl || appUrl.includes("localhost")) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_APP_URL is set to localhost. " +
          "QStash requires a public URL. " +
          "Deploy your app first, then call this endpoint from production.",
      },
      { status: 400 }
    );
  }

  if (!process.env.QSTASH_TOKEN) {
    return NextResponse.json({ error: "QSTASH_TOKEN not set" }, { status: 500 });
  }

  try {
    const client = new Client({ token: process.env.QSTASH_TOKEN });

    // Delete any existing schedule named "gps-simulator" to avoid duplicates
    const schedules = await client.schedules.list();
    for (const s of schedules) {
      if (s.destination === `${appUrl}/api/simulator`) {
        await client.schedules.delete(s.scheduleId);
      }
    }

    // Create a new schedule: every minute
    const schedule = await client.schedules.create({
      destination: `${appUrl}/api/simulator`,
      cron: "* * * * *",      // every minute — QStash minimum
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
      retries: 1,
    });

    return NextResponse.json({
      success: true,
      scheduleId: schedule.scheduleId,
      message: `Schedule registered: ${appUrl}/api/simulator will be called every minute.`,
    });
  } catch (error: any) {
    console.error("QStash schedule error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to register schedule" },
      { status: 500 }
    );
  }
}
