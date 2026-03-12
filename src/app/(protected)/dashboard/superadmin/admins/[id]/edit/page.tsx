// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/dashboard/superadmin/admins/[id]/edit/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
import EditAdminPage from "@/components/dashboard/superadmin/admins/EditAdminPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Admin · Super Admin" };

export default async function EditAdminRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditAdminPage id={id} />;
}