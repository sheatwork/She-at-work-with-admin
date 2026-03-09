// app/dashboard/admin/categories/create/page.tsx
import CreateCategoryPage from "@/components/dashboard/admin/categories/CreateCategoryPage";
import { Metadata } from "next";

export const metadata: Metadata = { title: "New Category · Admin" };

export default function Page() {
  return <CreateCategoryPage />;
}