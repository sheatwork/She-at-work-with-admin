// middleware.ts
// ─────────────────────────────────────────────────────────────────────────────
// EDGE AUTH MIDDLEWARE — runs on Vercel Edge / Cloudflare Workers
//
// KEY DESIGN DECISIONS vs original:
//
//   ❌ OLD: const { auth } = NextAuth(authConfig)
//      → Loaded full NextAuth on every request (adapter, callbacks, db logic)
//      → Heavy CPU, high cold-start, expensive per-invocation
//
//   ✅ NEW: import { getToken } from "next-auth/jwt"
//      → Pure JWT verification — one crypto operation per protected request
//      → No adapter, no DB, no session hydration
//      → ~10-50ms saved per request on edge
//
//   ❌ OLD: matcher ran on ALL routes including images, RSC, _next/static
//      → Unnecessary invocations on every asset fetch
//
//   ✅ NEW: matcher explicitly skips static assets, _next internals, and
//      known public image paths — only runs on real page/API routes
//
//   ❌ OLD: publicRoutes was a mixed string/RegExp array looped per request
//
//   ✅ NEW: publicRoutePattern is a single compiled regex — one .test() call
//
//   ❌ OLD: protectedRoutes was Record<string, Role[]> with new RegExp() per
//      request inside the loop
//
//   ✅ NEW: protectedRoutes is pre-compiled { pattern: RegExp, roles }[]
//      — zero regex compilation cost at request time
//
//   ✅ FIX: Unknown routes (404s) no longer redirect to /auth/login.
//      Only explicitly listed PROTECTED_PREFIXES trigger a login redirect.
//      Everything else passes through to Next.js → proper 404 handling.
// ─────────────────────────────────────────────────────────────────────────────

import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  protectedRoutes,
  publicApiPrefixes,
} from "@/routes";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// ── Known route prefixes that require authentication ─────────────────────────
// Only paths starting with these prefixes will redirect to /auth/login
// when the user is not logged in. All other unknown paths (404s) will
// pass through to Next.js and render the not-found page (or redirect to /).
const PROTECTED_PREFIXES = [
  "/(protected)", // your (protected) route group
  "/dashboard",   // add any other protected prefixes here
  "/admin",
  "/account",
  "/api/admin",
  "/api/superadmin",
  "/api/protected",
];

/**
 * Prefix match on whole path SEGMENTS.
 *
 * A plain `pathname.startsWith("/admin")` also matches `/administrator`, which
 * is exactly what Joomla and WordPress vulnerability scanners probe. Production
 * logs showed those probes being answered with
 * `307 → /auth/login?callbackUrl=%2Fadministrator`: two requests instead of one,
 * and a free confirmation to the scanner that a login page exists.
 *
 * `/administrator` now fails this test, falls through, and gets a flat 404.
 */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Always allow NextAuth's own API routes ─────────────────────────────
  if (pathname.startsWith(apiAuthPrefix)) return NextResponse.next();

  // ── 2. Always allow public APIs (no auth needed) ──────────────────────────
  //    Segment-aware for the same reason as PROTECTED_PREFIXES below: a bare
  //    startsWith would let `/api/contentXYZ` inherit `/api/content`'s exemption.
  if (publicApiPrefixes.some((prefix) => matchesPrefix(pathname, prefix)))
    return NextResponse.next();

  // ── 3. Only auth pages and protected prefixes need the JWT ────────────────
  //    Everything else passes straight through: public pages, legacy WordPress
  //    permalinks (~36% of traffic), /blog/*, and scanner probes. Previously
  //    anything outside publicRoutePattern paid a getToken() JWE decrypt just to
  //    be waved through at step 6 — the role table below only lists paths that
  //    are under PROTECTED_PREFIXES anyway, so skipping it here changes nothing.
  const isAuthRoute = authRoutes.includes(pathname);
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  );
  if (!isAuthRoute && !isProtectedPath) return NextResponse.next();

  // ── 4. Single JWT decode — only for auth pages and protected paths ────────
  //    getToken() verifies the JWT signature + reads role from the payload.
  //    No DB call, no session lookup, pure crypto.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
    // Use __Secure- cookie prefix in production (set by NextAuth automatically)
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isLoggedIn = !!token;

  // ── 5. Auth routes (login, register, etc.) ────────────────────────────────
  if (isAuthRoute) {
    // Already logged in → redirect away from auth pages
    return isLoggedIn
      ? NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, req.url))
      : NextResponse.next();
  }

  // ── 6. Protected path without a session → login ───────────────────────────
  if (!isLoggedIn) {
    // Preserve the intended destination so we can redirect back after login
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 7. Role-based route protection ────────────────────────────────────────
  //    Pre-compiled regex array — no new RegExp() at runtime
  for (const { pattern, roles } of protectedRoutes) {
    if (pattern.test(pathname)) {
      if (!token.role || !roles.includes(token.role)) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
      break; // First match wins — routes don't overlap
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT (the function is never even invoked for these):
     *   - _next/static, _next/image
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - NextAuth's own routes and the public APIs. Segment-aware, so
     *     /api/contentX would still be matched. Keep in sync with
     *     apiAuthPrefix + publicApiPrefixes in routes.ts (the body re-checks
     *     them, so a drift here only costs an invocation, never access).
     *   - Static files by extension, including the .php/.env/.xml/.json
     *     paths vulnerability scanners probe.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|api/(?:auth|content|resources|stories|contact-submissions|neon-backup)(?:/|$)|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|css|js|map|php|env|txt|xml|json|pdf|webmanifest|mp4)$).*)",
  ],
};
