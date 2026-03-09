// app/dashboard/admin/story-submissions/[id]/page.tsx
import { Metadata } from "next";
import StorySubmissionDetail from "@/components/dashboard/admin/story-submissions/StorySubmissionDetail";

export const metadata: Metadata = { title: "Review Submission · Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StorySubmissionDetail id={id} />;
}