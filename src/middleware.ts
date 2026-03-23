import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = [
  /^\/dashboard/,
  /^\/api\/admin/,
  /^\/api\/superadmin/,
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // check if route is protected
  const isProtected = PROTECTED_PATHS.some((r) => r.test(pathname));

  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url), 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*", "/api/superadmin/:path*"],
};