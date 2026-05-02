// 確定済みスクリムを D1 に snapshot として保存する API。
// 認証ユーザーのみ呼び出せる。同 ID の既存 scrim は owner 一致なら overwrite、
// 別 owner のものなら 403。

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionFromRequest } from "@/lib/auth/server";
import { findScrimOwner, saveScrimSnapshot } from "@/lib/db/scrims";
import type { ScrimSnapshot } from "@/lib/scrim/snapshot";

const SIDES = new Set(["home", "away"]);
const PLAYER_POSITIONS = new Set(["first", "second", "third", "sub"]);
const MATCH_POSITIONS = new Set(["first", "second", "third", "tiebreak"]);
const FORMATS = new Set(["regular", "playoff", "final"]);
const CONTROLS = new Set(["classic", "modern"]);

function isValidSnapshot(input: unknown): input is ScrimSnapshot {
  if (!input || typeof input !== "object") return false;
  const o = input as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return false;
  if (typeof o.format !== "string" || !FORMATS.has(o.format)) return false;
  if (typeof o.createdAt !== "number" || typeof o.finalizedAt !== "number") return false;
  if (o.teamHomeName !== null && typeof o.teamHomeName !== "string") return false;
  if (o.teamAwayName !== null && typeof o.teamAwayName !== "string") return false;
  if (!Array.isArray(o.players) || !Array.isArray(o.matches)) return false;
  for (const p of o.players as Array<Record<string, unknown>>) {
    if (typeof p.side !== "string" || !SIDES.has(p.side)) return false;
    if (typeof p.position !== "string" || !PLAYER_POSITIONS.has(p.position)) return false;
    if (typeof p.displayName !== "string" || p.displayName.length === 0) return false;
    if (p.characterId !== null && typeof p.characterId !== "number") return false;
    if (p.controlType !== null && (typeof p.controlType !== "string" || !CONTROLS.has(p.controlType))) return false;
  }
  for (const m of o.matches as Array<Record<string, unknown>>) {
    if (typeof m.roundNo !== "number") return false;
    if (typeof m.position !== "string" || !MATCH_POSITIONS.has(m.position)) return false;
    if (typeof m.winnerSide !== "string" || !SIDES.has(m.winnerSide)) return false;
    if (typeof m.points !== "number") return false;
  }
  return true;
}

export async function POST(request: Request): Promise<Response> {
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

  const { env } = await getCloudflareContext({ async: true });
  const existingOwner = await findScrimOwner(env.DB, body.id);
  if (existingOwner && existingOwner !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await saveScrimSnapshot(env.DB, session.user.id, body);
  return NextResponse.json({ ok: true, id: body.id });
}
