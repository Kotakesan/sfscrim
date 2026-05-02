// Mock provider 用のショートカットエンドポイント。
// dev/local 限定で「テストユーザーでログイン」ボタンから呼ばれる。
// 本番では route ごと 404（issue #82 PR-A の要件）。

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isMockAuthEnabledFromEnv } from "@/config/site";
import { getAuth, MOCK_TEST_USER } from "@/lib/auth/server";

export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  if (!isMockAuthEnabledFromEnv(env)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const auth = await getAuth();
  const baseUrl = new URL("/api/auth", request.url);
  const post = (path: string, payload: object) =>
    auth.handler(
      new Request(`${baseUrl}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

  const credentials = { email: MOCK_TEST_USER.email, password: MOCK_TEST_USER.password };
  const signIn = await post("sign-in/email", credentials);
  if (signIn.ok) return forwardCookies(signIn);

  // 初回呼び出し: ユーザー未作成 → サインアップ（autoSignIn: true で同時にログイン状態になる）
  const signUp = await post("sign-up/email", { ...credentials, name: MOCK_TEST_USER.name });
  return forwardCookies(signUp);
}

function forwardCookies(upstream: Response): Response {
  // Set-Cookie は `Expires=Wed, 21 Oct ...` のように値内にカンマを含むため、
  // Headers.get で coalesce された 1 行を再 split すると壊れる。getSetCookie で配列を取り、
  // 個別に append する。
  const headers = new Headers();
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  // body を JSON に差し替えるため、長さ・エンコーディング系は upstream のものを破棄する。
  const STRIP = new Set(["content-length", "content-encoding", "transfer-encoding", "set-cookie"]);
  upstream.headers.forEach((value, key) => {
    if (STRIP.has(key.toLowerCase())) return;
    headers.append(key, value);
  });
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  headers.set("content-type", "application/json");

  return new Response(JSON.stringify({ ok: upstream.ok, status: upstream.status }), {
    status: upstream.ok ? 200 : upstream.status,
    headers,
  });
}
