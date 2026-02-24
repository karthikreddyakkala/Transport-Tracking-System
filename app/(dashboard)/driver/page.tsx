"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher";
import {
  MapPin, Navigation, Clock, AlertTriangle, CheckCircle,
  XCircle, Flag, Gauge, Radio, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TrackingMap = dynamic(() => import("@/components/map/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface RouteRecommendation {
  recommendationId: string;
  reason: string;
  timeSavedMinutes: number;
  priority: number;
  expiresAt: string;
}

interface NextStop {
  name: string;
  minutesAway: number;
  confidence: number;
}

export default function DriverDashboard() {
  const [busData, setBusData] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<RouteRecommendation | null>(null);
  const [nextStops, setNextStops] = useState<NextStop[]>([]);
  const [speed, setSpeed] = useState(0);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [issuePriority, setIssuePriority] = useState<"low" | "medium" | "high" | "critical">("medium");

  useEffect(() => {
    fetch("/api/routes").then((r) => r.json()).then(setRoutes).catch(() => {});
    fetch("/api/buses")
      .then((r) => r.json())
      .then((buses: any[]) => {
        const active = buses.find((b) => b.status === "active");
        if (active) setBusData(active);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!busData?.id) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(CHANNELS.bus(busData.id));

    channel.bind(EVENTS.ROUTE_RECOMMENDATION, (data: RouteRecommendation) => {
      setRecommendation(data);
      toast.warning("Route recommendation received!", {
        description: `Save ${data.timeSavedMinutes} min by taking an alternate route.`,
      });
      setTimeout(() => {
        setRecommendation((prev) =>
          prev?.recommendationId === data.recommendationId ? null : prev
        );
      }, new Date(data.expiresAt).getTime() - Date.now());
    });

    const trackChannel = pusher.subscribe(CHANNELS.BUS_TRACKING);
    trackChannel.bind(EVENTS.LOCATION_UPDATE, (data: any) => {
      if (data.busId === busData.id) setSpeed(Math.round(data.speed));
    });

    fetch(`/api/eta?busId=${busData.id}`)
      .then((r) => r.json())
      .then((etas: any[]) => {
        setNextStops(
          etas.slice(0, 4).map((e) => ({
            name: e.stopName,
            minutesAway: e.minutesAway,
            confidence: e.confidence,
          }))
        );
      })
      .catch(() => {});

    return () => {
      pusher.unsubscribe(CHANNELS.bus(busData.id));
      pusher.unsubscribe(CHANNELS.BUS_TRACKING);
    };
  }, [busData?.id]);

  async function handleRecommendation(accept: boolean) {
    if (!recommendation) return;
    await fetch("/api/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: recommendation.recommendationId,
        status: accept ? "accepted" : "rejected",
        busId: busData?.id,
      }),
    });
    setRecommendation(null);
    toast.success(accept ? "Route updated — passengers notified." : "Keeping current route.");
  }

  async function submitIssue(e: React.FormEvent) {
    e.preventDefault();
    setIssueLoading(true);
    try {
      await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issueTitle,
          description: issueDesc,
          busId: busData?.id,
          priority: issuePriority,
        }),
      });
      toast.success("Issue reported — admin has been notified.");
      setIssueTitle("");
      setIssueDesc("");
      setIssuePriority("medium");
    } catch {
      toast.error("Failed to submit issue.");
    } finally {
      setIssueLoading(false);
    }
  }

  const initialBuses = busData?.location
    ? [{
        busId: busData.id,
        busNumber: busData.number,
        routeId: busData.currentRouteId ?? "",
        routeColor: busData.route?.color ?? "#3B82F6",
        latitude: busData.location.latitude,
        longitude: busData.location.longitude,
        speed: busData.location.speed,
        heading: busData.location.heading,
      }]
    : [];

  const sortedStops = busData?.route?.routeStops
    ? [...busData.route.routeStops].sort((a: any, b: any) => a.stopOrder - b.stopOrder)
    : [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-4">
      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {busData
              ? `Bus ${busData.number} · ${busData.route?.name ?? "Unassigned"}`
              : "No bus assigned yet"}
          </p>
        </div>

        {/* Speed indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 border rounded-xl px-4 py-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="text-2xl font-bold tabular-nums leading-none">{speed}</span>
              <span className="text-xs text-muted-foreground ml-1">km/h</span>
            </div>
          </div>
          {busData && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-medium">
              <Radio className="h-3.5 w-3.5" />
              On Duty
            </div>
          )}
        </div>
      </div>

      {/* ── Bus info cards ───────────────────────── */}
      {busData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Bus Number</p>
            <p className="font-bold text-lg">{busData.number}</p>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Route</p>
            <div className="flex items-center gap-1.5">
              {busData.route && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: busData.route.color }}
                />
              )}
              <p className="font-semibold text-sm truncate">
                {busData.route?.number ?? "—"}
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Capacity</p>
            <p className="font-bold text-lg">{busData.capacity ?? "—"}</p>
          </div>
        </div>
      )}

      {/* ── Route Recommendation Alert ───────────── */}
      {recommendation && (
        <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-orange-800">Route Recommendation</span>
                {recommendation.priority >= 3 && (
                  <Badge variant="destructive" className="text-xs h-5">High Priority</Badge>
                )}
              </div>
              <p className="text-sm text-orange-700">{recommendation.reason}</p>
              <p className="text-sm font-semibold text-emerald-700 mt-1">
                ~{recommendation.timeSavedMinutes} minutes saved by switching routes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleRecommendation(true)}>
              <CheckCircle className="h-3.5 w-3.5" /> Accept
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleRecommendation(false)}>
              <XCircle className="h-3.5 w-3.5" /> Decline
            </Button>
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────── */}
      <Tabs defaultValue="map" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-sm h-10">
          <TabsTrigger value="map" className="gap-1.5 text-xs">
            <Navigation className="h-3.5 w-3.5" /> Navigation
          </TabsTrigger>
          <TabsTrigger value="stops" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> Stops
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-1.5 text-xs">
            <Flag className="h-3.5 w-3.5" /> Report
          </TabsTrigger>
        </TabsList>

        {/* Navigation Map */}
        <TabsContent value="map">
          <div className="h-[calc(100vh-380px)] min-h-96 rounded-xl overflow-hidden border shadow-sm">
            <TrackingMap
              routes={routes}
              initialBuses={initialBuses}
              selectedBusId={busData?.id}
            />
          </div>
        </TabsContent>

        {/* Next Stops */}
        <TabsContent value="stops">
          <div className="space-y-4">
            {nextStops.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Upcoming Stops
                </p>
                <div className="space-y-2">
                  {nextStops.map((stop, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                        i === 0 ? "border-primary/50 bg-primary/5" : "bg-card"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                          i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{stop.name}</p>
                        <p className="text-xs text-muted-foreground">{stop.confidence}% confidence</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold tabular-nums leading-none">
                          {stop.minutesAway < 1 ? "<1" : stop.minutesAway}
                        </p>
                        <p className="text-xs text-muted-foreground">min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nextStops.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-medium text-muted-foreground">No ETA data yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">ETAs load when simulation is active.</p>
                </CardContent>
              </Card>
            )}

            {/* Full route */}
            {sortedStops.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Full Route · {sortedStops.length} stops
                </p>
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-64">
                      <div className="p-2">
                        {sortedStops.map((rs: any, i: number) => (
                          <div
                            key={rs.id}
                            className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex flex-col items-center shrink-0">
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground font-medium">
                                {i + 1}
                              </div>
                              {i < sortedStops.length - 1 && (
                                <div className="w-px h-4 bg-muted-foreground/20 mt-1" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 pb-4 flex-1">
                              <span className="text-sm">{rs.stop.name}</span>
                              {i === 0 && (
                                <Badge variant="outline" className="text-xs h-4 px-1">Start</Badge>
                              )}
                              {i === sortedStops.length - 1 && (
                                <Badge variant="outline" className="text-xs h-4 px-1">End</Badge>
                              )}
                            </div>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0 mb-4" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Issue Report */}
        <TabsContent value="report">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                Report an Issue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitIssue} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="issue-title" className="text-sm">Issue Title</Label>
                  <Input
                    id="issue-title"
                    placeholder="e.g. Stop sign broken at Stop 12"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Priority</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["low", "medium", "high", "critical"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setIssuePriority(p)}
                        className={cn(
                          "py-1.5 px-2 rounded-lg border text-xs font-medium capitalize transition-all",
                          issuePriority === p
                            ? p === "low" ? "border-slate-400 bg-slate-100 text-slate-700"
                              : p === "medium" ? "border-amber-400 bg-amber-50 text-amber-700"
                              : p === "high" ? "border-orange-400 bg-orange-50 text-orange-700"
                              : "border-red-400 bg-red-50 text-red-700"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issue-desc" className="text-sm">Description</Label>
                  <Textarea
                    id="issue-desc"
                    rows={4}
                    placeholder="Describe the issue in detail…"
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    required
                    className="resize-none"
                  />
                </div>

                <Button type="submit" disabled={issueLoading} className="w-full">
                  {issueLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Submit Report"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
