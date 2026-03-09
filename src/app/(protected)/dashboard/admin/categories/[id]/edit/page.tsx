// app/dashboard/admin/categories/[id]/edit/page.tsx

import EditCategoryPage from "@/components/dashboard/admin/categories/Editcategorypage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Category · Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditCategoryPage id={id} />;
}