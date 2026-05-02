// アカウント soft delete API。issue #82 PR-C。
// users.deleted_at + 自分の scrims.deleted_at をセット、session を全削除し、
// クライアントの cookie を expire させる。

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionFromRequest } from "@/lib/auth/server";
import { deleteAccount } from "@/lib/db/account";

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
];

// destructive 操作なので SameSite=Lax の defense-in-depth として Origin を必ず check する。
// 同オリジン or BETTER_AUTH_URL に一致しない場合は 403 で拒否。
function isSameOrigin(request: Request, expectedBaseUrl: string | undefined): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestUrl = new URL(request.url);
  if (new URL(origin).host === requestUrl.host) return true;
  if (expectedBaseUrl) {
    try {
      if (new URL(origin).host === new URL(expectedBaseUrl).host) return true;
    } catch {
      /* invalid env, fall through */
    }
  }
  return false;
}

export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  if (!isSameOrigin(request, env.BETTER_AUTH_URL)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const session = await getSessionFromRequest(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteAccount(env.DB, session.user.id);

  // クライアントの session cookie を期限切れにする
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of SESSION_COOKIE_NAMES) {
    headers.append(
      "set-cookie",
      `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`,
    );
  }
  return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers });
}
