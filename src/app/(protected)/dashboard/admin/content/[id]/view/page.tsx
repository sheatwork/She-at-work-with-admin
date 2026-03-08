// app/dashboard/admin/content/[id]/view/page.tsx

import ViewContentPage from "@/components/dashboard/admin/content/Viewcontentpage";


export const metadata = { title: "View Content · Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ViewContentPage id={id} />;
}