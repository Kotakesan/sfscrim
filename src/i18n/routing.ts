import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ja", "en"],
  defaultLocale: "ja",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export function localeHref(locale: string, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function buildLanguageAlternates(path = "/"): Record<string, string> {
  return Object.fromEntries(
    routing.locales.map((l) => [l, localeHref(l, path)]),
  );
}

export const OG_LOCALE: Record<Locale, string> = {
  ja: "ja_JP",
  en: "en_US",
};
