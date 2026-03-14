// src/app/(protected)/dashboard/agent/layout.tsx
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";


export default async function AgentLayout({ children }: { children: React.ReactNode }) {

  return <DashboardLayout>{children}</DashboardLayout>;
}