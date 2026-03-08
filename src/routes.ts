import { Role } from "./validaton-schema";

export const DEFAULT_LOGIN_REDIRECT: string = "/dashboard";

// Prefix for API authentication routes.
export const apiAuthPrefix: string = "/api/auth";

// Routes which are accessible to all.
// export const publicRoutes: string[] = ["/", "/auth/verify-email","/news","/about","/blogs","/contact","/entrechat","/events","/share-your-story"];

// Routes which are accessible to all.
export const publicRoutes: (string | RegExp)[] = ["/", "/auth/verify-email", "/news", "/about", "/blogs", "/contact", "/entrechat", "/events", "/share-your-story", /^\/blogs(\/.*)?$/, /^\/entrechat(\/.*)?$/, /^\/news(\/.*)?$/, /^\/events(\/.*)?$/, "/about/core-team", "/gettingstarted", "/gettingstarted/government-schemes-india", "/gettingstarted/global-schemes", "/about/press-room",/^\/about(\/.*)?$/];

// APIs which are accessible to all.
export const publicApis: string[] = ["/api/shareyourstory", "/api/contact-submissions", "/api/content"];

// Routes which are used for authentication.
export const authRoutes: string[] = [
  "/auth/error",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Routes which are protected with diffferent roles
export const protectedRoutes: Record<string, Role[]> = {
  "^/dashboard/admin(/.*)?$": ["ADMIN"],
  "^/dashboard/user(/.*)?$": ["USER"],
};