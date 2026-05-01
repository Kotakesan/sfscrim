import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { localeHref, buildLanguageAlternates } from "@/i18n/routing";
import { LegalShell } from "@/components/legal-shell";

const LAST_UPDATED = "2026-05-01";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta.contact" });
  const canonical = localeHref(locale, "/contact");
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: buildLanguageAlternates("/contact"),
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tMeta = await getTranslations("Meta.contact");
  const t = await getTranslations("Legal");
  const tContact = await getTranslations("Legal.contact");

  return (
    <LegalShell
      title={tMeta("title")}
      lastUpdated={t("lastUpdated", { date: LAST_UPDATED })}
    >
      <p className="m-0 text-base leading-[1.8] text-ink">
        {tContact("intro")}
      </p>
      <a
        href={tContact("githubUrl")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex h-[50px] items-center gap-2.5 border-2 border-accent bg-accent px-6 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink"
      >
        {tContact("githubLabel")}
      </a>
      <p className="mt-8 border-l-2 border-line pl-4 text-sm leading-[1.7] text-muted">
        {tContact("responseHint")}
      </p>
    </LegalShell>
  );
}
