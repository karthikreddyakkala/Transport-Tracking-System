import { db } from "./db";
import { buses, busLocations, routeStops, etaPredictions, busStops } from "./db/schema";
import { eq } from "drizzle-orm";
import { pusherServer, CHANNELS, EVENTS } from "./pusher";
import { calculateETAs } from "./eta-calculator";
import { haversineDistance } from "./eta-calculator";
import { nanoid } from "nanoid";

const STOP_DWELL_MS = 30_000; // 30 seconds at each stop
const UPDATE_INTERVAL_MS = 5_000; // 5 second updates
const SPEED_KMH = { min: 20, max: 50 };

function randomSpeed(): number {
  return SPEED_KMH.min + Math.random() * (SPEED_KMH.max - SPEED_KMH.min);
}

/** Interpolate a point along the line from (lat1,lng1) to (lat2,lng2) at fraction t ∈ [0,1] */
function interpolate(lat1: number, lng1: number, lat2: number, lng2: number, t: number) {
  return {
    lat: lat1 + (lat2 - lat1) * t,
    lng: lng1 + (lng2 - lng1) * t,
  };
}

/** Calculate heading (degrees) between two points */
function calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = lng2 - lng1;
  const y = Math.sin((dLng * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos((dLng * Math.PI) / 180);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export async function simulateBus(busId: string): Promise<{ success: boolean; message: string }> {
  const bus = await db.query.buses.findFirst({
    where: eq(buses.id, busId),
    with: {
      route: {
        with: {
          routeStops: {
            with: { stop: true },
            orderBy: (rs, { asc }) => [asc(rs.stopOrder)],
          },
        },
      },
      location: true,
    },
  });

  if (!bus || !bus.route) {
    return { success: false, message: "Bus or route not found" };
  }

  const stops = bus.route.routeStops;
  if (stops.length < 2) {
    return { success: false, message: "Route needs at least 2 stops" };
  }

  const currentStopIndex = bus.location?.currentStopIndex ?? 0;
  const nextStopIndex = Math.min(currentStopIndex + 1, stops.length - 1);

  if (currentStopIndex >= stops.length - 1) {
    // Bus completed route — reset to start
    const startStop = stops[0].stop;
    await db
      .insert(busLocations)
      .values({
        id: nanoid(),
        busId,
        latitude: startStop.latitude,
        longitude: startStop.longitude,
        speed: 0,
        heading: 0,
        currentStopIndex: 0,
        nextStopId: stops[1]?.stopId ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: busLocations.busId,
        set: {
          latitude: startStop.latitude,
          longitude: startStop.longitude,
          speed: 0,
          heading: 0,
          currentStopIndex: 0,
          nextStopId: stops[1]?.stopId ?? null,
          updatedAt: new Date(),
        },
      });

    return { success: true, message: "Bus reset to start of route" };
  }

  const currentStop = stops[currentStopIndex].stop;
  const nextStop = stops[nextStopIndex].stop;

  // Current position (or start from current stop if no location)
  const currentLat = bus.location?.latitude ?? currentStop.latitude;
  const currentLng = bus.location?.longitude ?? currentStop.longitude;

  const speed = randomSpeed();
  const distToNext = haversineDistance(currentLat, currentLng, nextStop.latitude, nextStop.longitude);
  const timeToNextSeconds = (distToNext / speed) * 3600;

  // Move fraction of distance based on update interval
  const fraction = Math.min(1, UPDATE_INTERVAL_MS / 1000 / timeToNextSeconds);
  const { lat: newLat, lng: newLng } = interpolate(
    currentLat,
    currentLng,
    nextStop.latitude,
    nextStop.longitude,
    fraction
  );

  const heading = calculateHeading(currentLat, currentLng, nextStop.latitude, nextStop.longitude);
  const arrivedAtStop = fraction >= 0.95;
  const newStopIndex = arrivedAtStop ? nextStopIndex : currentStopIndex;
  const nextNextStopId =
    arrivedAtStop && nextStopIndex + 1 < stops.length
      ? stops[nextStopIndex + 1].stopId
      : stops[nextStopIndex].stopId;

  // Update database
  await db
    .insert(busLocations)
    .values({
      id: nanoid(),
      busId,
      latitude: arrivedAtStop ? nextStop.latitude : newLat,
      longitude: arrivedAtStop ? nextStop.longitude : newLng,
      speed: arrivedAtStop ? 0 : speed,
      heading,
      currentStopIndex: newStopIndex,
      nextStopId: nextNextStopId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: busLocations.busId,
      set: {
        latitude: arrivedAtStop ? nextStop.latitude : newLat,
        longitude: arrivedAtStop ? nextStop.longitude : newLng,
        speed: arrivedAtStop ? 0 : speed,
        heading,
        currentStopIndex: newStopIndex,
        nextStopId: nextNextStopId,
        updatedAt: new Date(),
      },
    });

  // Publish real-time update
  await pusherServer.trigger(CHANNELS.BUS_TRACKING, EVENTS.LOCATION_UPDATE, {
    busId,
    busNumber: bus.number,
    routeId: bus.currentRouteId,
    routeColor: bus.route.color,
    latitude: arrivedAtStop ? nextStop.latitude : newLat,
    longitude: arrivedAtStop ? nextStop.longitude : newLng,
    speed: arrivedAtStop ? 0 : speed,
    heading,
    currentStopIndex: newStopIndex,
    timestamp: new Date().toISOString(),
  });

  // Calculate and store ETAs
  const etas = await calculateETAs({
    busId,
    routeId: bus.currentRouteId!,
    currentLat: arrivedAtStop ? nextStop.latitude : newLat,
    currentLng: arrivedAtStop ? nextStop.longitude : newLng,
    currentSpeed: speed,
    currentStopIndex: newStopIndex,
  });

  // Store top 3 ETAs
  for (const eta of etas.slice(0, 3)) {
    await db
      .insert(etaPredictions)
      .values({
        id: nanoid(),
        busId,
        stopId: eta.stopId,
        predictedArrival: eta.predictedArrival,
        confidence: eta.confidence,
        minutesAway: eta.minutesAway,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [etaPredictions.busId, etaPredictions.stopId],
        set: {
          predictedArrival: eta.predictedArrival,
          confidence: eta.confidence,
          minutesAway: eta.minutesAway,
          updatedAt: new Date(),
        },
      });
  }

  return {
    success: true,
    message: arrivedAtStop
      ? `Bus ${bus.number} arrived at ${nextStop.name}`
      : `Bus ${bus.number} moving towards ${nextStop.name}`,
  };
}
