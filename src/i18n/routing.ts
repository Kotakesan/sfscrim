import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "en"],
  defaultLocale: "ja",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export function localeHref(locale: string, base = ""): string {
  return locale === routing.defaultLocale ? `${base}/` : `${base}/${locale}`;
}

export function buildLanguageAlternates(base = ""): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((l) => [l, localeHref(l, base)]),
  );
}

export const OG_LOCALE: Record<Locale, string> = {
  ja: "ja_JP",
  en: "en_US",
};
