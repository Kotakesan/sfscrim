import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { localeHref, buildLanguageAlternates } from "@/i18n/routing";
import { isDevEnv } from "@/config/site";
import { PageShell } from "@/components/page-shell";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.login" });
  const canonical = localeHref(locale, "/login");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
    alternates: {
      canonical,
      languages: buildLanguageAlternates("/login"),
    },
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.login");
  const mockEnabled = await isDevEnv();

  return (
    <PageShell maxWidth="narrow">
      <header className="mb-8 border-b-2 border-ink pb-6">
        <h1 className="m-0 font-display text-[clamp(36px,6vw,64px)] font-extrabold leading-[1] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-[1.7] text-ink">{t("description")}</p>
      </header>

      {mockEnabled ? (
        <LoginForm />
      ) : (
        <div className="border-2 border-line p-6">
          <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.01em]">
            {t("comingSoonHeading")}
          </h2>
          <p className="mt-3 text-base leading-[1.7] text-ink-2">
            {t("comingSoonBody")}
          </p>
        </div>
      )}
    </PageShell>
  );
}
