// app/(protected)/dashboard/admin/layout.tsx
// auth() is correct here — this is a protected layout.
// Middleware already blocked non-ADMIN users before this renders,
// so this auth() call is just for passing user data to DashboardLayout
// (e.g. showing the logged-in user's name/avatar in the sidebar).
//
// If DashboardLayout doesn't need session data, you can remove auth()
// here too and have DashboardLayout call useSession() client-side instead.

import { auth } from "@/auth";
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Double-check role (middleware is the first line of defence,
  // this is a safety net for direct API calls or middleware misses)
  if (session?.user?.role !== "ADMIN") {
    redirect("/auth/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}