import type { D1Database, Fetcher } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ASSETS: Fetcher;
    APP_ENV: string;
    // Better Auth — dev は .dev.vars / wrangler env vars、本番は Cloudflare Secrets で設定。
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL?: string;
  }
}

export {};
