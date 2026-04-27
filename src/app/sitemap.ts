import type { MetadataRoute } from "next";
import { buildLanguageAlternates } from "@/i18n/routing";
import { SITE } from "@/config/site";

const LAST_MODIFIED = "2026-04-28";
const LANGUAGES = buildLanguageAlternates(SITE.url);

export default function sitemap(): MetadataRoute.Sitemap {
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
