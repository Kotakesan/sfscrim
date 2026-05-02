// owner-only soft delete API for /history のスクリム削除動線。

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionFromRequest } from "@/lib/auth/server";
import { softDeleteScrim } from "@/lib/db/scrims";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSessionFromRequest(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const ok = await softDeleteScrim(env.DB, session.user.id, id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
