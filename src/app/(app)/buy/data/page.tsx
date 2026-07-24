import { redirect } from "next/navigation";

export default async function LegacyDataPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; planId?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ service: "data" });
  if (params.phone) query.set("phone", params.phone);
  if (params.planId) query.set("planId", params.planId);
  redirect(`/services?${query.toString()}`);
}
