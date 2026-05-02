// Better Auth サーバインスタンス。Cloudflare Workers では D1 binding が isolate ごとに
// 安定しているので、binding identity をキーにキャッシュする（毎リクエストで drizzle +
// betterAuth を組み立て直すと、ルートテーブル構築コストがリクエスト毎に発生する）。
//
// Mock 戦略: APP_ENV !== "production" のときだけ emailAndPassword を有効化する。
// 本番では戦略ごと未登録になるため `/api/auth/sign-in/email` 等もすべて 404 になる。
//
// 関連: issue #82, src/lib/auth/schema.ts, migrations/0002_*.sql

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { isMockAuthEnabledFromEnv } from "@/config/site";
import { authSchema } from "./schema";

export const MOCK_TEST_USER = {
  email: "test@sfscrim.local",
  password: "sfscrim-mock-password",
  name: "Test User",
} as const;

export type AuthInstance = ReturnType<typeof buildAuth>;

export function buildAuth(env: CloudflareEnv) {
  const db = drizzle(env.DB, { schema: authSchema });
  const mockEnabled = isMockAuthEnabledFromEnv(env);

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: mockEnabled
      ? {
          enabled: true,
          autoSignIn: true,
          // Mock 用なので最低長だけ守る。本番で emailAndPassword を使う予定はない。
          minPasswordLength: 8,
        }
      : { enabled: false },
  });
}

let cached: { db: D1Database; auth: AuthInstance } | null = null;

export async function getAuth(): Promise<AuthInstance> {
  const { env } = await getCloudflareContext({ async: true });
  if (cached?.db === env.DB) return cached.auth;
  cached = { db: env.DB, auth: buildAuth(env) };
  return cached.auth;
}

export type SessionContext = Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;

export async function getSessionFromRequest(
  headers: Headers,
): Promise<SessionContext> {
  const auth = await getAuth();
  return auth.api.getSession({ headers });
}
