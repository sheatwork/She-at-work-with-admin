// routes.ts
// Single source of truth for all route config.
// Normalized to regex only — no mixed string/RegExp array.
// Middleware reads this directly with zero runtime parsing overhead.

import type { Role } from "./validaton-schema";

export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
export const apiAuthPrefix          = "/api/auth";

// ── Public routes ──────────────────────────────────────────────────────────
// There is no public-route list: the middleware treats every path as public
// unless it is an authRoutes entry or under its PROTECTED_PREFIXES, so new
// public pages need no registration here.

// ── Public API prefixes ────────────────────────────────────────────────────
// Checked with startsWith — keep as array, easy to extend.
export const publicApiPrefixes: string[] = [
  "/api/contact-submissions",
  "/api/content",
  "/api/stories",
  "/api/resources",
  "/api/neon-backup"
];

// ── Auth routes (login, register, etc.) ───────────────────────────────────
export const authRoutes: string[] = [
  "/auth/error",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// ── Role-based protected routes ────────────────────────────────────────────
// Pre-compiled regex → Role[] map. Compiled once at module load, not per-request.
export const protectedRoutes: { pattern: RegExp; roles: Role[] }[] = [
  { pattern: /^\/dashboard\/admin(\/.*)?$/,      roles: ["ADMIN"] },
  { pattern: /^\/dashboard\/user(\/.*)?$/,       roles: ["USER"] },
  // SUPER_ADMIN surfaces. /api/superadmin/* previously matched nothing here and
  // nothing in the middleware's PROTECTED_PREFIXES either, so it answered 200 to
  // anonymous callers — including /api/superadmin/export (full users + content
  // dump) and /api/superadmin/analytics (16 unbounded COUNT(*) queries).
  { pattern: /^\/dashboard\/superadmin(\/.*)?$/, roles: ["SUPER_ADMIN"] },
  { pattern: /^\/api\/superadmin(\/.*)?$/,       roles: ["SUPER_ADMIN"] },
];