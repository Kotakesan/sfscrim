// アカウント soft delete API。issue #82 PR-C。
// users.deleted_at + 自分の scrims.deleted_at をセット、session を全削除し、
// クライアントの cookie を expire させる。

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuth, getSessionFromRequest } from "@/lib/auth/server";
import { deleteAccount } from "@/lib/db/account";

// Better Auth が cookie を rotate / 追加した場合の保険として残す念のための strip list。
// 1 次的な expire は auth.api.signOut 経由で行う（cookie 名・属性とも Better Auth 内部に
// 追従させる）が、念のため代表名を `Max-Age=0` で flush しておく。
const FALLBACK_COOKIE_NAMES = [
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
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const requestUrl = new URL(request.url);
  if (originHost === requestUrl.host) return true;
  if (expectedBaseUrl) {
    try {
      if (originHost === new URL(expectedBaseUrl).host) return true;
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

  // 1 次的な cookie 失効は Better Auth 経由（cookie 名・属性が library に追従）。
  // 失敗ケース（cookie 名 mismatch 等）の保険として fallback list でも Max-Age=0 を返す。
  const headers = new Headers({ "content-type": "application/json" });
  try {
    const auth = await getAuth();
    const upstream = await auth.api.signOut({ headers: request.headers, asResponse: true });
    upstream.headers.getSetCookie?.().forEach((c) => headers.append("set-cookie", c));
  } catch {
    /* signOut 失敗時も fallback list で expire させる */
  }
  for (const name of FALLBACK_COOKIE_NAMES) {
    headers.append("set-cookie", `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
  }
  return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers });
}
