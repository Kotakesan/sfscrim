import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ScrimWorkspace } from "./scrim-workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("scrim.title"),
    description: t("scrim.description"),
    robots: { index: false, follow: false },
  };
}

export default async function ScrimDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ScrimWorkspace id={id} />;
}
