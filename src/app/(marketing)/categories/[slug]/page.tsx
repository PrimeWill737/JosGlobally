import { redirect } from "next/navigation";
export default async function Category({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/shop?category=${encodeURIComponent(slug)}`);
}
