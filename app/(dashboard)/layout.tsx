import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Bus, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LogoutButton from "@/components/LogoutButton";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role ?? "passenger";
  const dashboardPath = role === "admin" ? "/admin" : role === "driver" ? "/driver" : "/passenger";

  // Unread notification count
  let unreadCount = 0;
  try {
    const unread = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));
    unreadCount = unread.length;
  } catch {
    // ignore
  }

  const roleConfig: Record<string, { label: string; className: string }> = {
    admin: { label: "Admin", className: "bg-purple-100 text-purple-700 border-purple-200" },
    driver: { label: "Driver", className: "bg-blue-100 text-blue-700 border-blue-200" },
    passenger: { label: "Passenger", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };

  const cfg = roleConfig[role] ?? roleConfig.passenger;
  const initials = session.user.name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href={dashboardPath} className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Bus className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base tracking-tight hidden sm:block">TransitTrack</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <div className="relative">
              <button className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* User info */}
            <div className="hidden sm:flex items-center gap-2 border rounded-lg px-2.5 py-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                {initials}
              </div>
              <span className="text-sm font-medium leading-none">{session.user.name.split(" ")[0]}</span>
              <Badge variant="outline" className={`text-xs h-5 px-1.5 ${cfg.className}`}>
                {cfg.label}
              </Badge>
            </div>

            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
