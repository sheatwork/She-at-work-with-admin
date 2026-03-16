// app/(protected)/dashboard/page.tsx
// CHANGED: from "use client" + useEffect + useCurrentRole
//          to server component + auth() + redirect()
//
// WHY:
//   The old version loaded the page, hydrated React, ran useEffect,
//   THEN redirected — users saw a spinner for ~300-800ms unnecessarily.
//   auth() here is fine because this is a PROTECTED page (only logged-in
//   users reach it — middleware already verified the JWT).
//   The DB lookup cost is justified: this page only renders when someone
//   actually navigates to /dashboard.
//
// auth() is ONLY called on pages that genuinely need it (protected routes).
// NOT in root layout where it ran on every public page.

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth();

  // Middleware guarantees the user is logged in before reaching here.
  // But be defensive — if somehow session is missing, send to login.
  if (!session?.user?.role) {
    redirect("/auth/login");
  }

  switch (session.user.role) {
    case "ADMIN":
      redirect("/dashboard/admin");
    case "USER":
      redirect("/dashboard/user");
    case "SUPER_ADMIN":
      redirect("/dashboard/superadmin");
    default:
      redirect("/auth/login");
  }
}