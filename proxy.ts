import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/api/auth", "/api/chat"];

// Role-based route prefixes
const ROLE_ROUTES: Record<string, string> = {
  passenger: "/passenger",
  driver: "/driver",
  admin: "/admin",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and API routes (except protected ones)
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isPublic) return NextResponse.next();

  // Check session cookie
  const sessionCookie = getSessionCookie(req);

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
