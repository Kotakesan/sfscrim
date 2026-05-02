// Better Auth サーバインスタンス。
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
  // 本番で BETTER_AUTH_SECRET が未設定だと Better Auth はランダム fallback を使い、
  // isolate 間で署名が不一致になり session が壊れる。早期 fail-loud で気付けるようにする。
  if (env.APP_ENV === "production" && !env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
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

// 同じ D1 binding を見たら同じ Better Auth instance を再利用する（route table 構築コストを
// 減らす）。WeakMap なので binding が破棄されればエントリも GC される。
const authByDb = new WeakMap<D1Database, AuthInstance>();

export async function getAuth(): Promise<AuthInstance> {
  const { env } = await getCloudflareContext({ async: true });
  let auth = authByDb.get(env.DB);
  if (!auth) {
    auth = buildAuth(env);
    authByDb.set(env.DB, auth);
  }
  return auth;
}

export type SessionContext = Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;

export async function getSessionFromRequest(
  headers: Headers,
): Promise<SessionContext> {
  const auth = await getAuth();
  return auth.api.getSession({ headers });
}
