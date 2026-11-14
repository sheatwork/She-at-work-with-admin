// routes.ts
// Single source of truth for all route config.
// Normalized to regex only — no mixed string/RegExp array.
// Middleware reads this directly with zero runtime parsing overhead.

import { Role } from "./validaton-schema";

export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
export const apiAuthPrefix          = "/api/auth";

// ── Public routes ──────────────────────────────────────────────────────────
// Converted to a single compiled regex so middleware does ONE .test() call
// instead of looping an array on every request.
//
// Covers:
//   /                          homepage
//   /auth/verify-email         email link
//   /about, /about/*           about + core-team + press-room
//   /news, /news/*             news listing + detail
//   /blogs, /blogs/*
//   /entrechat, /entrechat/*
//   /events, /events/*
//   /contact
//   /share-your-story
//   /gettingstarted, /gettingstarted/*
//   /sheDiaries, /sheDiaries/*
//   /press/*
//
// NOTE on /sheDiaries: it was missing from this pattern, so ~19% of production
// traffic fell through to the getToken() JWT verification in the middleware
// before being waved through anyway. Listing it here short-circuits at step 3.
export const publicRoutePattern = /^(\/|\/auth\/verify-email|\/about(\/.*)?|\/news(\/.*)?|\/blogs(\/.*)?|\/entrechat(\/.*)?|\/events(\/.*)?|\/press(\/.*)?|\/sheDiaries(\/.*)?|\/contact|\/share-your-story|\/gettingstarted(\/.*)?)$/;

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
  // /api/admin/* only required *a* session, so any self-registered USER could
  // call every admin endpoint (content writes, contact submissions, uploads,
  // site settings). Same role as the /dashboard/admin UI that calls them.
  { pattern: /^\/api\/admin(\/.*)?$/,            roles: ["ADMIN"] },
];