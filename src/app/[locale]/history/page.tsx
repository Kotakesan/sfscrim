import type { Metadata } from "next";
import { headers } from "next/headers";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { localeHref, buildLanguageAlternates } from "@/i18n/routing";
import { PageShell } from "@/components/page-shell";
import { getSessionFromRequest } from "@/lib/auth/server";
import { getScrimsForUser, type StoredScrimSummary } from "@/lib/db/scrims";
import { HistoryList } from "./history-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta.history" });
  const canonical = localeHref(locale, "/history");
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: buildLanguageAlternates("/history"),
    },
  };
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tMeta = await getTranslations("Meta.history");
  const t = await getTranslations("History");

  const requestHeaders = await headers();
  const session = await getSessionFromRequest(requestHeaders);
  let storedScrims: StoredScrimSummary[] = [];
  if (session?.user) {
    const { env } = await getCloudflareContext({ async: true });
    storedScrims = await getScrimsForUser(env.DB, session.user.id);
  }

  return (
    <PageShell maxWidth="wide">
      <header className="mb-8 border-b-2 border-ink pb-6">
        <h1 className="m-0 font-display text-[clamp(36px,6vw,64px)] font-extrabold leading-[1] tracking-[-0.02em]">
          {tMeta("title")}
        </h1>
        <p className="mt-4 text-base leading-[1.7] text-ink">{t("intro")}</p>
        <p className="mt-2 text-sm leading-[1.7] text-muted">
          {session?.user ? t("storageNoteSignedIn") : t("storageNote")}
        </p>
      </header>
      <HistoryList signedIn={Boolean(session?.user)} storedScrims={storedScrims} />
    </PageShell>
  );
}
