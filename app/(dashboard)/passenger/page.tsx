import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buses, routes as routesTable, favoriteRoutes, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import TrackingMap from "@/components/map/MapWrapper";
import ChatInterface from "@/components/chat/ChatInterface";
import PassengerTabs from "@/components/passenger/PassengerTabs";
import { Bus, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function PassengerDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const userId = session.user.id;

  const [activeBuses, activeRoutes, userFavorites, userNotifications] = await Promise.all([
    db.query.buses.findMany({
      where: eq(buses.status, "active"),
      with: { location: true, route: true },
    }),
    db.query.routes.findMany({
      where: eq(routesTable.status, "active"),
      with: { routeStops: { with: { stop: true }, orderBy: (rs, { asc }) => [asc(rs.stopOrder)] } },
    }),
    db.query.favoriteRoutes.findMany({
      where: eq(favoriteRoutes.userId, userId),
      with: { route: true },
    }),
    db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: (n, { desc }) => [desc(n.createdAt)],
      limit: 10,
    }),
  ]);

  const initialBuses = activeBuses
    .filter((b) => b.location)
    .map((b) => ({
      busId: b.id,
      busNumber: b.number,
      routeId: b.currentRouteId ?? "",
      routeColor: b.route?.color ?? "#3B82F6",
      latitude: b.location!.latitude,
      longitude: b.location!.longitude,
      speed: b.location!.speed,
      heading: b.location!.heading,
    }));

  const unreadCount = userNotifications.filter((n) => !n.read).length;
  const favoriteRouteIds = userFavorites.map((f) => f.routeId);
  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeBuses.length} buses active · {activeRoutes.length} routes running
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Bell className="h-3 w-3" />
              {unreadCount} new
            </Badge>
          )}
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-200 rounded-full px-2.5 py-1 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Buses", value: activeBuses.length, icon: Bus, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Routes", value: activeRoutes.length, icon: null, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Saved Routes", value: userFavorites.length, icon: null, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 ${bg}`}>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Main Tabs ────────────────────────────────── */}
      <PassengerTabs
        userId={userId}
        initialBuses={initialBuses}
        activeBuses={activeBuses as any}
        activeRoutes={activeRoutes as any}
        favoriteRouteIds={favoriteRouteIds}
      />
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
