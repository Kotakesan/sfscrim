// SameSite=Lax cookie の defense-in-depth として、destructive な POST/DELETE は
// Origin header が同オリジン or BETTER_AUTH_URL に一致することを check する。
// browser fetch は Origin header を forbidden にしているため攻撃者は偽造不能。
// Origin が無い request (curl 等) は拒否する保守的判定。
//
// 関連: issue #87, src/app/api/account/delete/route.ts (origin 実装の発祥)

export function isSameOrigin(
  request: Request,
  expectedBaseUrl: string | undefined,
): boolean {
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

// 共通レスポンス。route ごとの形式揺れを防ぐ。
export const FORBIDDEN_RESPONSE = (): Response =>
  new Response(JSON.stringify({ error: "forbidden" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
