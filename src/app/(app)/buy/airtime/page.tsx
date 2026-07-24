import { redirect } from "next/navigation";

export default async function LegacyAirtimePage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; amount?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ service: "airtime" });
  if (params.phone) query.set("phone", params.phone);
  if (params.amount) query.set("amount", params.amount);
  redirect(`/services?${query.toString()}`);
}
