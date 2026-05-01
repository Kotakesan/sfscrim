import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { localeHref, buildLanguageAlternates } from "@/i18n/routing";
import { LegalShell } from "@/components/legal-shell";
import {
  LegalSectionList,
  type LegalSection,
} from "@/components/legal-section-list";

const LAST_UPDATED = "2026-05-01";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta.privacy" });
  const canonical = localeHref(locale, "/privacy");
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: buildLanguageAlternates("/privacy"),
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tMeta = await getTranslations("Meta.privacy");
  const t = await getTranslations("Legal");
  const tPrivacy = await getTranslations("Legal.privacy");
  const sections = tPrivacy.raw("sections") as LegalSection[];

  return (
    <LegalShell
      title={tMeta("title")}
      lastUpdated={t("lastUpdated", { date: LAST_UPDATED })}
    >
      <LegalSectionList intro={tPrivacy("intro")} sections={sections} />
    </LegalShell>
  );
}
