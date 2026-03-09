// app/dashboard/admin/contact-submissions/page.tsx
import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import ContactSubmissionsList from "@/components/dashboard/admin/contact-submissions/ContactSubmissionsList";
import { RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Messages · Admin Dashboard",
  description: "Review and respond to contact form submissions",
};

export default function ContactSubmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Contact Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Messages submitted through the public contact form
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Messages</CardTitle>
          <CardDescription>
            Open messages need a response. Mark them resolved once handled — you can always reopen them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }>
            <ContactSubmissionsList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}