import type { MetadataRoute } from "next";
import {
  buildLanguageAlternates,
  localeHref,
  routing,
} from "@/i18n/routing";
import { SITE, isDevEnv } from "@/config/site";

export const dynamic = "force-dynamic";

const LAST_MODIFIED = "2026-05-01";

const STATIC_PATHS: ReadonlyArray<{
  path: string;
  changeFrequency: "weekly" | "yearly";
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (await isDevEnv()) return [];
  return STATIC_PATHS.map(({ path, changeFrequency, priority }) => {
    const localeAlts = buildLanguageAlternates(path);
    const languages = Object.fromEntries(
      Object.entries(localeAlts).map(([loc, href]) => [loc, `${SITE.url}${href}`]),
    );
    return {
      url: `${SITE.url}${localeHref(routing.defaultLocale, path)}`,
      lastModified: LAST_MODIFIED,
      changeFrequency,
      priority,
      alternates: { languages },
    };
  });
}
