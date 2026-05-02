import { getCloudflareContext } from "@opennextjs/cloudflare";

export const SITE = {
  url: "https://sfscrim.sf6.workers.dev",
  ogImagePath: "/og-image.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
} as const;

let cachedIsDev: boolean | undefined;

export async function isDevEnv(): Promise<boolean> {
  if (cachedIsDev !== undefined) return cachedIsDev;
  cachedIsDev = await detectIsDev();
  return cachedIsDev;
}

// Mock auth (emailAndPassword + 「テストユーザーでログイン」ボタン) は本番以外で有効。
// dev/preview/未設定すべてで mock を出すため "production 以外" を判定軸にする。
// 同期版が必要な箇所（API route handler など）から直接 env を渡して使う。
export function isMockAuthEnabledFromEnv(env: { APP_ENV?: string }): boolean {
  return env.APP_ENV !== "production";
}

async function detectIsDev(): Promise<boolean> {
  // Fail-open by design: the [locale] layout is SSG-prerendered, so this runs
  // at build time *with no Cloudflare context*. A single build artifact ships
  // to both prod and dev workers, so we must not bake noindex into the HTML
  // at build time. Dev's noindex protection comes from robots.ts (dynamic) and
  // from generateMetadata on dynamic routes — both of which run on the dev
  // worker at request time, where getCloudflareContext does resolve.
  const fromProcess = process.env.APP_ENV;
  if (fromProcess === "development") return true;
  if (fromProcess === "production") return false;
  try {
    const { env } = await getCloudflareContext();
    return env.APP_ENV === "development";
  } catch {
    return false;
  }
}
