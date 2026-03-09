// app/dashboard/admin/categories/page.tsx
import CategoriesTable from "@/components/dashboard/admin/categories/CategoriesTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Categories · Admin Dashboard",
  description: "Manage content categories",
};

export default function CategoriesPage() {
  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organise your content with categories across all content types
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/categories/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Category
          </Link>
        </Button>
      </div>
        </CardHeader>
        <CardContent>
          <CategoriesTable />
        </CardContent>
      </Card>
    </div>
  );
}