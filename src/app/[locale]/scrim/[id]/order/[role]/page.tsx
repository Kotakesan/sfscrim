import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { isRole } from "@/lib/order-state";
import { OrderInput } from "./order-input";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string; role: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("orderInput.title"),
    description: t("orderInput.description"),
    robots: { index: false, follow: false },
  };
}

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
