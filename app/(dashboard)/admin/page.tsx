import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buses, routes as routesTable, busStops, users, issues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Bus, Route, MapPin, Users, AlertTriangle, Activity,
  Settings, TrendingUp, Zap, CheckCircle2
} from "lucide-react";
import SimulatorControl from "@/components/admin/SimulatorControl";
import TrackingMap from "@/components/map/MapWrapper";
import CreateBusDialog from "@/components/admin/CreateBusDialog";
import CreateRouteDialog from "@/components/admin/CreateRouteDialog";
import CreateStopDialog from "@/components/admin/CreateStopDialog";
import ResolveIssueButton from "@/components/admin/ResolveIssueButton";

export default async function AdminDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;
  if (role !== "admin") redirect("/passenger");

  const [allBuses, activeRoutes, allStops, allUsers, openIssues] = await Promise.all([
    db.query.buses.findMany({
      with: { route: true, driver: { columns: { id: true, name: true } }, location: true },
    }),
    db.query.routes.findMany({
      with: { routeStops: { with: { stop: true }, orderBy: (rs, { asc }) => [asc(rs.stopOrder)] } },
    }),
    db.query.busStops.findMany({ limit: 50 }),
    db.query.users.findMany({ columns: { id: true, name: true, email: true, role: true, createdAt: true } }),
    db.query.issues.findMany({
      where: eq(issues.status, "open"),
      with: {
        stop: { columns: { id: true, name: true } },
        bus: { columns: { id: true, number: true } },
      },
      orderBy: (i, { desc }) => [desc(i.createdAt)],
      limit: 20,
    }),
  ]);

  const activeBuses = allBuses.filter((b) => b.status === "active");
  const maintenanceBuses = allBuses.filter((b) => b.status === "maintenance");
  const activeRoutesCount = activeRoutes.filter((r) => r.status === "active").length;
  const driverCount = allUsers.filter((u) => (u as any).role === "driver").length;
  const passengerCount = allUsers.filter((u) => (u as any).role === "passenger").length;

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

  const stats = [
    {
      title: "Active Buses",
      value: activeBuses.length,
      sub: `${maintenanceBuses.length} in maintenance`,
      icon: Bus,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Routes",
      value: activeRoutesCount,
      sub: `${activeRoutes.length} total`,
      icon: Route,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      title: "Stops",
      value: allStops.length,
      sub: "registered stops",
      icon: MapPin,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      title: "Users",
      value: allUsers.length,
      sub: `${driverCount} drivers · ${passengerCount} passengers`,
      icon: Users,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-100",
    },
    {
      title: "Open Issues",
      value: openIssues.length,
      sub: openIssues.length === 0 ? "All clear!" : "Need attention",
      icon: AlertTriangle,
      color: openIssues.length > 0 ? "text-red-600" : "text-muted-foreground",
      bg: openIssues.length > 0 ? "bg-red-50" : "bg-muted/30",
      border: openIssues.length > 0 ? "border-red-100" : "border-border",
    },
  ];

  const priorityConfig: Record<string, string> = {
    low: "text-slate-600 bg-slate-100 border-slate-300",
    medium: "text-amber-600 bg-amber-50 border-amber-300",
    high: "text-orange-600 bg-orange-50 border-orange-300",
    critical: "text-red-600 bg-red-50 border-red-300",
  };

  const roleColors: Record<string, string> = {
    admin: "text-purple-600 bg-purple-50 border-purple-200",
    driver: "text-blue-600 bg-blue-50 border-blue-200",
    passenger: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">System overview and management</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-200 rounded-full px-3 py-1.5 text-xs font-medium">
          <Activity className="h-3.5 w-3.5" />
          System Online
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(({ title, value, sub, icon: Icon, color, bg, border }) => (
          <div key={title} className={`rounded-xl border ${border} ${bg} p-4`}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── GPS Simulator ────────────────────────── */}
      <SimulatorControl busIds={activeBuses.map((b) => b.id)} />

      {/* ── Tabs ─────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />Overview
          </TabsTrigger>
          <TabsTrigger value="buses" className="text-xs gap-1.5">
            <Bus className="h-3.5 w-3.5" />Buses
          </TabsTrigger>
          <TabsTrigger value="routes" className="text-xs gap-1.5">
            <Route className="h-3.5 w-3.5" />Routes
          </TabsTrigger>
          <TabsTrigger value="stops" className="text-xs gap-1.5">
            <MapPin className="h-3.5 w-3.5" />Stops
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />Users
          </TabsTrigger>
          <TabsTrigger value="issues" className="text-xs gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />Issues
            {openIssues.length > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-xs">{openIssues.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview / Live Map */}
        <TabsContent value="overview">
          <div className="space-y-4">
            <div className="h-[calc(100vh-400px)] min-h-96 rounded-xl overflow-hidden border shadow-sm">
              <TrackingMap routes={activeRoutes as any} initialBuses={initialBuses} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Fleet Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: "Active", count: activeBuses.length, dot: "bg-emerald-500" },
                    { label: "Maintenance", count: maintenanceBuses.length, dot: "bg-amber-500" },
                    { label: "Inactive", count: allBuses.length - activeBuses.length - maintenanceBuses.length, dot: "bg-slate-300" },
                  ].map(({ label, count, dot }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <span className="text-sm flex-1">{label}</span>
                      <span className="text-sm font-semibold tabular-nums">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">User Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: "Passengers", count: passengerCount, dot: "bg-emerald-500" },
                    { label: "Drivers", count: driverCount, dot: "bg-blue-500" },
                    { label: "Admins", count: allUsers.filter((u) => (u as any).role === "admin").length, dot: "bg-purple-500" },
                  ].map(({ label, count, dot }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <span className="text-sm flex-1">{label}</span>
                      <span className="text-sm font-semibold tabular-nums">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: "Total Stops", count: allStops.length },
                    { label: "Active Routes", count: activeRoutesCount },
                    { label: "Open Issues", count: openIssues.length },
                  ].map(({ label, count }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold tabular-nums">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Buses Table */}
        <TabsContent value="buses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
              <div>
                <CardTitle>Fleet Management</CardTitle>
                <CardDescription>{allBuses.length} total buses</CardDescription>
              </div>
              <CreateBusDialog />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bus Number</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBuses.map((bus) => (
                    <TableRow key={bus.id}>
                      <TableCell className="font-semibold">{bus.number}</TableCell>
                      <TableCell>
                        {bus.route ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bus.route.color }} />
                            <span className="text-sm">{bus.route.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {bus.driver?.name ?? <span className="text-muted-foreground">None</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            bus.status === "active"
                              ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                              : bus.status === "maintenance"
                              ? "border-amber-300 text-amber-600 bg-amber-50"
                              : "border-slate-300 text-slate-500"
                          }
                        >
                          {bus.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm tabular-nums">
                        {bus.location ? `${Math.round(bus.location.speed)} km/h` : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {allBuses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        <Bus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No buses found. Add your first bus.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routes Table */}
        <TabsContent value="routes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
              <div>
                <CardTitle>Routes</CardTitle>
                <CardDescription>{activeRoutes.length} routes configured</CardDescription>
              </div>
              <CreateRouteDialog />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Endpoints</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRoutes.map((route) => {
                    const first = route.routeStops[0]?.stop?.name;
                    const last = route.routeStops[route.routeStops.length - 1]?.stop?.name;
                    return (
                      <TableRow key={route.id}>
                        <TableCell>
                          <div
                            className="w-8 h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center"
                            style={{ backgroundColor: route.color }}
                          >
                            {route.number}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{route.name}</TableCell>
                        <TableCell className="tabular-nums">{route.routeStops.length}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {first && last ? `${first} → ${last}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              route.status === "active"
                                ? "border-emerald-300 text-emerald-600 bg-emerald-50"
                                : "border-slate-300 text-slate-500"
                            }
                          >
                            {route.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {activeRoutes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        No routes found. Add your first route.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stops Table */}
        <TabsContent value="stops">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
              <div>
                <CardTitle>Bus Stops</CardTitle>
                <CardDescription>{allStops.length} stops registered</CardDescription>
              </div>
              <CreateStopDialog />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStops.map((stop) => (
                    <TableRow key={stop.id}>
                      <TableCell className="font-medium">{stop.name}</TableCell>
                      <TableCell>
                        {stop.code ? (
                          <Badge variant="outline" className="text-xs font-mono">{stop.code}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                        {(stop as any).address ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {allStops.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No stops found. Add your first stop.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Table */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>
                {allUsers.length} users · {driverCount} drivers · {passengerCount} passengers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                            {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                          <span className="font-medium text-sm">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${roleColors[(user as any).role ?? "passenger"]}`}
                        >
                          {(user as any).role ?? "passenger"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Open Issues</CardTitle>
                  <CardDescription>
                    {openIssues.length === 0
                      ? "No open issues — system running smoothly"
                      : `${openIssues.length} issue${openIssues.length === 1 ? "" : "s"} need attention`}
                  </CardDescription>
                </div>
                {openIssues.length === 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" /> All clear
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{issue.title}</p>
                          {issue.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${priorityConfig[issue.priority] ?? priorityConfig.medium}`}
                        >
                          {issue.priority}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(issue as any).stop?.name ?? (issue as any).bus?.number ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(issue.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <ResolveIssueButton issueId={issue.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {openIssues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No open issues. Everything&apos;s running smoothly.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
