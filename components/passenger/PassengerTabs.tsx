"use client";

import { useState, useEffect, useTransition } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatInterface from "@/components/chat/ChatInterface";
import {
  MapPin, Clock, Star, MessageSquare, Bus, Search,
  TrendingUp, Navigation, Gauge, Heart, HeartOff
} from "lucide-react";
import { toast } from "sonner";

const TrackingMap = dynamic(() => import("@/components/map/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    </div>
  ),
});

interface BusInfo {
  id: string;
  number: string;
  status: string;
  route?: { id: string; name: string; color: string; number: string } | null;
  location?: { latitude: number; longitude: number; speed: number; heading: number } | null;
}

interface RouteInfo {
  id: string;
  number: string;
  name: string;
  color: string;
  status: string;
  routeStops: Array<{ stopOrder: number; stop: { id: string; name: string; latitude: number; longitude: number } }>;
}

interface InitialBus {
  busId: string;
  busNumber: string;
  routeId: string;
  routeColor: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
}

interface ETA {
  busId: string;
  busNumber: string;
  routeName: string;
  routeColor: string;
  stopName: string;
  minutesAway: number;
  confidence: number;
}

interface Props {
  userId: string;
  initialBuses: InitialBus[];
  activeBuses: BusInfo[];
  activeRoutes: RouteInfo[];
  favoriteRouteIds: string[];
}

export default function PassengerTabs({
  userId,
  initialBuses,
  activeBuses,
  activeRoutes,
  favoriteRouteIds: initialFavorites,
}: Props) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));
  const [etas, setEtas] = useState<ETA[]>([]);
  const [etaLoading, setEtaLoading] = useState(false);
  const [routeSearch, setRouteSearch] = useState("");
  const [, startTransition] = useTransition();

  // Load ETAs for all active buses when arrivals tab is visible
  async function loadETAs() {
    if (activeBuses.length === 0) return;
    setEtaLoading(true);
    try {
      const results = await Promise.allSettled(
        activeBuses.slice(0, 6).map(async (bus) => {
          const res = await fetch(`/api/eta?busId=${bus.id}`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data as any[]).slice(0, 2).map((e) => ({
            busId: bus.id,
            busNumber: bus.number,
            routeName: bus.route?.name ?? "Unknown",
            routeColor: bus.route?.color ?? "#3B82F6",
            stopName: e.stopName,
            minutesAway: e.minutesAway,
            confidence: e.confidence,
          }));
        })
      );
      const allEtas = results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<ETA[]>).value)
        .sort((a, b) => a.minutesAway - b.minutesAway);
      setEtas(allEtas);
    } finally {
      setEtaLoading(false);
    }
  }

  async function toggleFavorite(routeId: string) {
    const isFav = favorites.has(routeId);
    // Optimistic update
    setFavorites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(routeId) : next.add(routeId);
      return next;
    });

    try {
      await fetch("/api/favorites", {
        method: isFav ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });
      toast.success(isFav ? "Removed from favorites" : "Added to favorites");
    } catch {
      // Revert on error
      setFavorites((prev) => {
        const next = new Set(prev);
        isFav ? next.add(routeId) : next.delete(routeId);
        return next;
      });
      toast.error("Failed to update favorites");
    }
  }

  const filteredRoutes = activeRoutes.filter(
    (r) =>
      r.name.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.number.toLowerCase().includes(routeSearch.toLowerCase()) ||
      r.routeStops.some((rs) => rs.stop.name.toLowerCase().includes(routeSearch.toLowerCase()))
  );

  return (
    <Tabs
      defaultValue="map"
      className="space-y-4"
      onValueChange={(v) => {
        if (v === "arrivals") startTransition(() => { loadETAs(); });
      }}
    >
      <TabsList className="grid grid-cols-4 w-full max-w-lg h-10">
        <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm">
          <MapPin className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Map</span>
        </TabsTrigger>
        <TabsTrigger value="arrivals" className="gap-1.5 text-xs sm:text-sm">
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Arrivals</span>
        </TabsTrigger>
        <TabsTrigger value="routes" className="gap-1.5 text-xs sm:text-sm">
          <Star className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Routes</span>
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Chat</span>
        </TabsTrigger>
      </TabsList>

      {/* ── Live Map ───────────────────────────────── */}
      <TabsContent value="map" className="space-y-4">
        <div className="h-[calc(100vh-340px)] min-h-96 rounded-xl overflow-hidden border shadow-sm">
          <TrackingMap routes={activeRoutes} initialBuses={initialBuses} />
        </div>

        {activeBuses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Active Buses
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeBuses.slice(0, 6).map((bus) => (
                <div
                  key={bus.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-sm transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: bus.route?.color ?? "#3B82F6" }}
                  >
                    {bus.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{bus.route?.name ?? "Unassigned"}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      {bus.location ? `${Math.round(bus.location.speed)} km/h` : "No GPS"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ── Arrivals ───────────────────────────────── */}
      <TabsContent value="arrivals">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Upcoming Arrivals
            </p>
            <Button variant="ghost" size="sm" onClick={loadETAs} className="h-7 text-xs gap-1">
              <Navigation className="h-3 w-3" /> Refresh
            </Button>
          </div>

          {etaLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : etas.length === 0 && activeBuses.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Bus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">No active buses</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Check back during service hours.</p>
              </CardContent>
            </Card>
          ) : etas.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">Click Refresh to load ETAs</p>
                <p className="text-sm text-muted-foreground/60 mt-1">ETA data requires the simulator to be running.</p>
                <Button variant="outline" size="sm" onClick={loadETAs} className="mt-4 gap-1">
                  <Navigation className="h-3 w-3" /> Load Arrivals
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {etas.map((eta, i) => (
                <div
                  key={`${eta.busId}-${i}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:shadow-sm transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: eta.routeColor }}
                  >
                    {eta.busNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{eta.stopName}</p>
                    <p className="text-xs text-muted-foreground truncate">{eta.routeName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold tabular-nums leading-none">
                      {eta.minutesAway < 1 ? "<1" : eta.minutesAway}
                    </p>
                    <p className="text-xs text-muted-foreground">min</p>
                  </div>
                  <div className="shrink-0">
                    <div
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        eta.confidence >= 80
                          ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                          : "text-amber-600 bg-amber-50 border-amber-200"
                      }`}
                    >
                      {eta.confidence}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All active buses summary when no ETA data */}
          {etas.length === 0 && activeBuses.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All Buses</p>
              {activeBuses.map((bus) => (
                <div
                  key={bus.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border bg-card"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: bus.route?.color ?? "#3B82F6" }}
                  >
                    {bus.number}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{bus.route?.name ?? "Unknown Route"}</p>
                    <p className="text-xs text-muted-foreground">
                      {bus.location ? `${Math.round(bus.location.speed)} km/h` : "Location unknown"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 text-emerald-600 border-emerald-200">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Routes ─────────────────────────────────── */}
      <TabsContent value="routes">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search routes or stops…"
              value={routeSearch}
              onChange={(e) => setRouteSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Favorites first */}
          {favorites.size > 0 && routeSearch === "" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Saved Routes
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {activeRoutes
                  .filter((r) => favorites.has(r.id))
                  .map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      isFav={true}
                      onToggleFav={toggleFavorite}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* All routes */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {routeSearch ? `Results (${filteredRoutes.length})` : "All Routes"}
            </p>
            {filteredRoutes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No routes match your search.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {filteredRoutes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    isFav={favorites.has(route.id)}
                    onToggleFav={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* ── AI Chat ────────────────────────────────── */}
      <TabsContent value="chat" className="h-[calc(100vh-320px)] min-h-96">
        <div className="h-full rounded-xl border overflow-hidden bg-card flex flex-col">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/20 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Transit AI Assistant</p>
              <p className="text-xs text-muted-foreground">Powered by Gemini</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface userId={userId} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function RouteCard({
  route,
  isFav,
  onToggleFav,
}: {
  route: RouteInfo;
  isFav: boolean;
  onToggleFav: (id: string) => void;
}) {
  const firstStop = route.routeStops[0]?.stop?.name;
  const lastStop = route.routeStops[route.routeStops.length - 1]?.stop?.name;

  return (
    <div className="group flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:shadow-sm transition-all">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
        style={{ backgroundColor: route.color }}
      >
        {route.number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{route.name}</p>
        <p className="text-xs text-muted-foreground">
          {route.routeStops.length} stops
          {firstStop && lastStop && (
            <> · {firstStop} → {lastStop}</>
          )}
        </p>
      </div>
      <button
        onClick={() => onToggleFav(route.id)}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        title={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        {isFav ? (
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
        ) : (
          <HeartOff className="h-4 w-4 text-muted-foreground group-hover:text-rose-400 transition-colors" />
        )}
      </button>
    </div>
  );
}
