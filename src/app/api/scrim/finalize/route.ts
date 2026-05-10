// 確定済みスクリムを D1 に snapshot として保存する API。
// 認証ユーザーのみ呼び出せる。同 ID の既存 scrim は owner 一致なら overwrite、
// 別 owner のものなら 403。

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionFromRequest } from "@/lib/auth/server";
import { isSameOrigin } from "@/lib/auth/csrf";
import { findScrimOwner, saveScrimSnapshot } from "@/lib/db/scrims";
import type { ScrimSnapshot } from "@/lib/scrim/snapshot";

const SIDES = new Set(["home", "away"]);
const PLAYER_POSITIONS = new Set(["first", "second", "third", "sub"]);
const MATCH_POSITIONS = new Set(["first", "second", "third", "tiebreak"]);
const FORMATS = new Set(["regular", "playoff", "final"]);
const CONTROLS = new Set(["classic", "modern"]);

const ID_RE = /^[A-Za-z0-9_-]{4,64}$/;
const NAME_MAX = 200;
const POINTS_MAX = 1000; // 最大 1 試合 1000pt（実運用は 90pt 上限）

const isPosInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

function isValidSnapshot(input: unknown): input is ScrimSnapshot {
  if (!input || typeof input !== "object") return false;
  const o = input as Record<string, unknown>;
  if (typeof o.id !== "string" || !ID_RE.test(o.id)) return false;
  if (typeof o.format !== "string" || !FORMATS.has(o.format)) return false;
  if (!isPosInt(o.createdAt) || !isPosInt(o.finalizedAt)) return false;
  if (o.teamHomeName !== null && (typeof o.teamHomeName !== "string" || o.teamHomeName.length > NAME_MAX)) return false;
  if (o.teamAwayName !== null && (typeof o.teamAwayName !== "string" || o.teamAwayName.length > NAME_MAX)) return false;
  if (!Array.isArray(o.players) || !Array.isArray(o.matches)) return false;
  for (const p of o.players as Array<Record<string, unknown>>) {
    if (typeof p.side !== "string" || !SIDES.has(p.side)) return false;
    if (typeof p.position !== "string" || !PLAYER_POSITIONS.has(p.position)) return false;
    if (typeof p.displayName !== "string" || p.displayName.length === 0 || p.displayName.length > NAME_MAX) return false;
    if (p.characterId !== null && !isPosInt(p.characterId)) return false;
    if (p.controlType !== null && (typeof p.controlType !== "string" || !CONTROLS.has(p.controlType))) return false;
  }
  for (const m of o.matches as Array<Record<string, unknown>>) {
    if (!isPosInt(m.roundNo) || (m.roundNo as number) < 1) return false;
    if (typeof m.position !== "string" || !MATCH_POSITIONS.has(m.position)) return false;
    if (typeof m.winnerSide !== "string" || !SIDES.has(m.winnerSide)) return false;
    if (!isPosInt(m.points) || (m.points as number) > POINTS_MAX) return false;
  }
  return true;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isValidSnapshot(body)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const existingOwner = await findScrimOwner(env.DB, body.id);
  if (existingOwner && existingOwner !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await saveScrimSnapshot(env.DB, session.user.id, body);
  return NextResponse.json({ ok: true, id: body.id });
}
