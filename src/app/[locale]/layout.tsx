import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  routing,
  localeHref,
  buildLanguageAlternates,
  OG_LOCALE,
  type Locale,
} from "@/i18n/routing";
import { SITE, isDevEnv } from "@/config/site";
import "../globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const METADATA_BASE = new URL(SITE.url);
const LANGUAGES = buildLanguageAlternates();

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  const canonical = localeHref(locale);
  const ogLocale = OG_LOCALE[locale as Locale] ?? OG_LOCALE[routing.defaultLocale];
  const dev = await isDevEnv();

  return {
    metadataBase: METADATA_BASE,
    title: {
      default: t("appName"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: t("siteName"),
    ...(dev ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical,
      languages: LANGUAGES,
    },
    openGraph: {
      type: "website",
      siteName: t("siteName"),
      title: t("appName"),
      description: t("description"),
      url: canonical,
      locale: ogLocale,
      images: [
        {
          url: SITE.ogImagePath,
          width: SITE.ogImageWidth,
          height: SITE.ogImageHeight,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("appName"),
      description: t("description"),
      images: [SITE.ogImagePath],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${bricolage.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans overflow-x-clip">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
