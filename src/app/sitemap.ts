import type { MetadataRoute } from "next";
import { buildLanguageAlternates } from "@/i18n/routing";
import { SITE, isDevEnv } from "@/config/site";

export const dynamic = "force-dynamic";

const LAST_MODIFIED = "2026-04-28";
const LANGUAGES = buildLanguageAlternates(SITE.url);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (await isDevEnv()) return [];
  return [
    {
      url: `${SITE.url}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: LANGUAGES },
    },
  ];
}
