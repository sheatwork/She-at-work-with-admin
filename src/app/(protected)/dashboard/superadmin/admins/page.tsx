import AdminsList from "@/components/dashboard/superadmin/admins/AdminsList";
import { Metadata } from "next";
 
export const metadata: Metadata = { title: "Admin Management · Super Admin" };
 
export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, manage and revoke admin access across the platform
        </p>
      </div>
      <AdminsList />
    </div>
  );
}
 
 