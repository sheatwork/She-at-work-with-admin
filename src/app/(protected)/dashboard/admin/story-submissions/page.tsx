// app/dashboard/admin/story-submissions/page.tsx
import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import StorySubmissionsList from "@/components/dashboard/admin/story-submissions/StorySubmissionsList";
import { RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Story Submissions · Admin Dashboard",
  description: "Review and publish user story submissions",
};

export default function StorySubmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Story Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review stories submitted by users and publish them as content
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>
            Pending submissions need review. Approved stories are published directly to the content library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }>
            <StorySubmissionsList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}