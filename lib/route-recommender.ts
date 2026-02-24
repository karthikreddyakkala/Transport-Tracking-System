import { db } from "./db";
import { buses, busLocations, routeStops, trafficConditions, routeRecommendations } from "./db/schema";
import { eq } from "drizzle-orm";
import { pusherServer, CHANNELS, EVENTS } from "./pusher";
import { haversineDistance } from "./eta-calculator";
import { nanoid } from "nanoid";

const DELAY_THRESHOLD_MINUTES = 10;
const TIME_SAVE_THRESHOLD_MINUTES = 5;
const TRAFFIC_SLOW_FACTOR = 0.3; // 30% slower = suggest reroute

/**
 * Simulate traffic level (1-5) on a segment.
 * In production this would query real traffic data.
 */
function getTrafficFactor(level: number): number {
  // level 1 = free flow, level 5 = gridlock
  const factors: Record<number, number> = { 1: 1.0, 2: 0.85, 3: 0.70, 4: 0.55, 5: 0.40 };
  return factors[level] ?? 1.0;
}

/**
 * Simulate current traffic level (random, refreshed periodically).
 * In production you'd query the trafficConditions table.
 */
function simulateTrafficLevel(): number {
  // Weighted towards moderate (2-3)
  const weights = [0.2, 0.35, 0.25, 0.15, 0.05];
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) return i + 1;
  }
  return 2;
}

export async function analyzeAndRecommend(busId: string): Promise<void> {
  const bus = await db.query.buses.findFirst({
    where: eq(buses.id, busId),
    with: { route: { with: { routeStops: { with: { stop: true }, orderBy: (rs, { asc }) => [asc(rs.stopOrder)] } } }, location: true },
  });

  if (!bus || !bus.route || !bus.location) return;

  const location = bus.location;
  const trafficLevel = simulateTrafficLevel();
  const trafficFactor = getTrafficFactor(trafficLevel);

  if (trafficFactor >= (1 - TRAFFIC_SLOW_FACTOR)) return; // Traffic is acceptable

  // Calculate remaining time with current traffic
  const speed = Math.max(location.speed, 10);
  const adjustedSpeed = speed * trafficFactor;

  const remainingStops = bus.route.routeStops.filter(
    (rs) => rs.stopOrder > (location.currentStopIndex ?? 0)
  );

  if (remainingStops.length === 0) return;

  let currentTime = 0;
  let prevLat = location.latitude;
  let prevLng = location.longitude;

  for (const rs of remainingStops) {
    const dist = haversineDistance(prevLat, prevLng, rs.stop.latitude, rs.stop.longitude);
    currentTime += (dist / adjustedSpeed) * 60;
    prevLat = rs.stop.latitude;
    prevLng = rs.stop.longitude;
  }

  // Calculate time without traffic
  let freeFlowTime = 0;
  prevLat = location.latitude;
  prevLng = location.longitude;
  for (const rs of remainingStops) {
    const dist = haversineDistance(prevLat, prevLng, rs.stop.latitude, rs.stop.longitude);
    freeFlowTime += (dist / speed) * 60;
    prevLat = rs.stop.latitude;
    prevLng = rs.stop.longitude;
  }

  const delayMinutes = currentTime - freeFlowTime;
  if (delayMinutes < DELAY_THRESHOLD_MINUTES) return;

  const timeSaved = Math.round(delayMinutes * 0.6); // Estimate 60% recovery
  if (timeSaved < TIME_SAVE_THRESHOLD_MINUTES) return;

  // Create recommendation
  const recommendation = {
    id: nanoid(),
    busId,
    currentRouteId: bus.currentRouteId!,
    recommendedRouteId: null,
    reason: `Heavy traffic detected (level ${trafficLevel}/5). Current route is ~${Math.round(delayMinutes)} minutes slower than normal. Alternative paths could save ~${timeSaved} minutes.`,
    timeSavedMinutes: timeSaved,
    priority: trafficLevel >= 4 ? 3 : trafficLevel === 3 ? 2 : 1,
    status: "pending" as const,
    expiresAt: new Date(Date.now() + 60 * 1000), // 60 second timeout
    createdAt: new Date(),
  };

  await db.insert(routeRecommendations).values(recommendation);

  // Send to driver via Pusher
  await pusherServer.trigger(CHANNELS.bus(busId), EVENTS.ROUTE_RECOMMENDATION, {
    recommendationId: recommendation.id,
    reason: recommendation.reason,
    timeSavedMinutes: timeSaved,
    priority: recommendation.priority,
    expiresAt: recommendation.expiresAt,
  });
}
