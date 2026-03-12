// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/dashboard/superadmin/admins/new/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
import CreateAdminPage from "@/components/dashboard/superadmin/admins/CreateAdminPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "New Admin · Super Admin" };

export default function NewAdminPage() {
  return <CreateAdminPage />;
}
 