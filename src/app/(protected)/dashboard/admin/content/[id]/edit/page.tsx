// app/dashboard/admin/content/[id]/edit/page.tsx

import EditContentPage from "@/components/dashboard/admin/content/Editcontentpage";


export const metadata = { title: "Edit Content · Admin" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditContentPage id={id} />;
}