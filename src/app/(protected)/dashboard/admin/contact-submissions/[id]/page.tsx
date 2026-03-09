// app/dashboard/admin/contact-submissions/[id]/page.tsx
import { Metadata } from "next";
import ContactSubmissionDetail from "@/components/dashboard/admin/contact-submissions/ContactSubmissionDetail";

export const metadata: Metadata = { title: "Contact Message · Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactSubmissionDetail id={id} />;
}