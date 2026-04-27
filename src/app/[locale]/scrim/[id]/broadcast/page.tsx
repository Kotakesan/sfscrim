import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { BroadcastView } from "./broadcast-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("broadcast.title"),
    description: t("broadcast.description"),
    robots: { index: false, follow: false },
  };
}

export default async function BroadcastPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <BroadcastView id={id} />;
}
