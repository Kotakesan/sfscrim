import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRole } from "@/lib/order-state";
import { OrderInput } from "./order-input";

export default async function OrderInputPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; role: string }>;
}) {
  const { locale, id, role } = await params;
  setRequestLocale(locale);
  if (!isRole(role)) notFound();

  return <OrderInput id={id} role={role} />;
}
