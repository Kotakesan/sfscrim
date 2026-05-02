// D1 上のスクリム履歴テーブルへのアクセスヘルパ。
// soft delete を漏らさないため、すべての SELECT で `deleted_at IS NULL` を強制する。
//
// 関連: migrations/0002_better_auth_and_v2_schema.sql, src/lib/auth/schema.ts, issue #82.

import type { D1Database } from "@cloudflare/workers-types";
import type { ScrimSnapshot } from "@/lib/scrim/snapshot";

export interface StoredScrimSummary {
  id: string;
  format: "regular" | "playoff" | "final";
  teamHomeName: string | null;
  teamAwayName: string | null;
  finalizedAt: number;
  matchCount: number;
}

interface ScrimRow {
  id: string;
  format: "regular" | "playoff" | "final";
  team_home_name: string | null;
  team_away_name: string | null;
  finalized_at: number;
}

export async function findScrimOwner(
  db: D1Database,
  scrimId: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT created_by FROM scrims WHERE id = ? AND deleted_at IS NULL")
    .bind(scrimId)
    .first<{ created_by: string }>();
  return row?.created_by ?? null;
}

// finalize 済みスクリムの immutable snapshot を保存する（同 ID の上書きは owner のみ）。
// ON CONFLICT 句の WHERE で `created_by = ?` を組み込み、別 owner の row を上書きしない
// atomic UPSERT にする（race window で他人が先に INSERT したケースを閉じる）。
// 子表は INSERT OR REPLACE ではなく DELETE → INSERT。新 snapshot が rows を減らすケース
// （sub を後から外した等）でも残骸を残さないため。
export async function saveScrimSnapshot(
  db: D1Database,
  ownerUserId: string,
  snap: ScrimSnapshot,
): Promise<void> {
  const stmts = [
    // 子表の DELETE にも owner 条件を入れる（race で別 owner が先に scrims を作っていた場合、
    // 攻撃者の子データで上書きしないため）。NOT EXISTS で「scrims が未作成」or「自分の所有」のみ通す。
    db
      .prepare(
        `DELETE FROM scrim_users WHERE scrim_id = ?1
           AND NOT EXISTS (SELECT 1 FROM scrims WHERE id = ?1 AND created_by != ?2)`,
      )
      .bind(snap.id, ownerUserId),
    db
      .prepare(
        `DELETE FROM scrim_matches WHERE scrim_id = ?1
           AND NOT EXISTS (SELECT 1 FROM scrims WHERE id = ?1 AND created_by != ?2)`,
      )
      .bind(snap.id, ownerUserId),
    db
      .prepare(
        `INSERT INTO scrims (id, created_by, format, status, team_home_name, team_away_name, created_at, finalized_at, deleted_at)
         VALUES (?1, ?2, ?3, 'finished', ?4, ?5, ?6, ?7, NULL)
         ON CONFLICT(id) DO UPDATE SET
           format = excluded.format,
           team_home_name = excluded.team_home_name,
           team_away_name = excluded.team_away_name,
           finalized_at = excluded.finalized_at,
           deleted_at = NULL
         WHERE scrims.created_by = ?2`,
      )
      .bind(
        snap.id,
        ownerUserId,
        snap.format,
        snap.teamHomeName,
        snap.teamAwayName,
        snap.createdAt,
        snap.finalizedAt,
      ),
    // 子 INSERT も owner check 付き SELECT 経由にし、race で別 owner が parent を保持して
    // いた場合の上書きを完全に閉じる（INSERT-SELECT は WHERE 不一致で 0 行になる）。
    ...snap.players.map((p) =>
      db
        .prepare(
          `INSERT INTO scrim_users (scrim_id, user_id, side, position, display_name, character_id, control_type)
           SELECT ?1, NULL, ?3, ?4, ?5, ?6, ?7 FROM scrims
           WHERE id = ?1 AND created_by = ?2`,
        )
        .bind(snap.id, ownerUserId, p.side, p.position, p.displayName, p.characterId, p.controlType),
    ),
    ...snap.matches.map((m) =>
      db
        .prepare(
          `INSERT INTO scrim_matches (scrim_id, round_no, position, winner_side, points)
           SELECT ?1, ?3, ?4, ?5, ?6 FROM scrims
           WHERE id = ?1 AND created_by = ?2`,
        )
        .bind(snap.id, ownerUserId, m.roundNo, m.position, m.winnerSide, m.points),
    ),
  ];
  await db.batch(stmts);
}

// ログインユーザーが owner / メンバーとして関わった、生きている scrim 一覧。
export async function getScrimsForUser(
  db: D1Database,
  userId: string,
): Promise<StoredScrimSummary[]> {
  const result = await db
    .prepare(
      `SELECT s.id, s.format, s.team_home_name, s.team_away_name, s.finalized_at,
              (SELECT COUNT(*) FROM scrim_matches WHERE scrim_id = s.id) AS match_count
       FROM scrims s
       WHERE s.deleted_at IS NULL
         AND (s.created_by = ?1
              OR s.id IN (SELECT scrim_id FROM scrim_users WHERE user_id = ?1))
       ORDER BY s.finalized_at DESC`,
    )
    .bind(userId)
    .all<ScrimRow & { match_count: number }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    format: row.format,
    teamHomeName: row.team_home_name,
    teamAwayName: row.team_away_name,
    finalizedAt: row.finalized_at,
    matchCount: Number(row.match_count ?? 0),
  }));
}

// owner が一致する scrim だけ soft delete する（一致しなければ false）。
export async function softDeleteScrim(
  db: D1Database,
  ownerUserId: string,
  scrimId: string,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare(
      `UPDATE scrims SET deleted_at = ?
       WHERE id = ? AND created_by = ? AND deleted_at IS NULL`,
    )
    .bind(now, scrimId, ownerUserId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
