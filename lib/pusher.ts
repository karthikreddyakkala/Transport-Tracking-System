import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
      }
    );
  }
  return pusherClientInstance;
}

// Channel names
export const CHANNELS = {
  BUS_TRACKING: "bus-tracking",
  bus: (busId: string) => `bus-${busId}`,
  user: (userId: string) => `user-${userId}`,
  admin: "admin-alerts",
} as const;

// Event names
export const EVENTS = {
  LOCATION_UPDATE: "location-update",
  ETA_UPDATE: "eta-update",
  ROUTE_RECOMMENDATION: "route-recommendation",
  DRIVER_RESPONSE: "driver-response",
  PASSENGER_NOTIFICATION: "passenger-notification",
  NEW_ISSUE: "new-issue",
} as const;
