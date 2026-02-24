import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { simulateBus } from "@/lib/gps-simulator";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

// This endpoint is called by Upstash QStash every 5 seconds
async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { busId } = body;

    if (!busId) {
      // Run all active buses
      const activeBuses = await db.query.buses.findMany({
        where: eq(buses.status, "active"),
      });

      const results = await Promise.allSettled(
        activeBuses.map((bus) => simulateBus(bus.id))
      );

      return NextResponse.json({
        processed: activeBuses.length,
        results: results.map((r, i) => ({
          busId: activeBuses[i].id,
          ...(r.status === "fulfilled" ? r.value : { success: false, message: String(r.reason) }),
        })),
      });
    }

    const result = await simulateBus(busId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Simulator error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}

// In production, verify QStash signature
export const POST = process.env.NODE_ENV === "production"
  ? verifySignatureAppRouter(handler)
  : handler;
