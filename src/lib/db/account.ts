// アカウント削除のための D1 helper。
// users.deleted_at + 自分が owner の scrims.deleted_at を一括 soft delete し、
// session を全消去する。scrim_users.user_id は touch せず player 履歴は残す。
//
// 関連: issue #82 PR-C, migrations/0002_better_auth_and_v2_schema.sql

import type { D1Database } from "@cloudflare/workers-types";

export async function deleteAccount(db: D1Database, userId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare("UPDATE user SET deleted_at = ? WHERE id = ?").bind(now, userId),
    // owner scrim を cascade soft delete（既に deleted_at があるものは触らない）
    db
      .prepare(
        "UPDATE scrims SET deleted_at = ? WHERE created_by = ? AND deleted_at IS NULL",
      )
      .bind(now, userId),
    // 全 session 失効
    db.prepare("DELETE FROM session WHERE user_id = ?").bind(userId),
  ]);
}

export async function isAccountDeleted(db: D1Database, email: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT deleted_at FROM user WHERE email = ?")
    .bind(email)
    .first<{ deleted_at: number | null }>();
  return Boolean(row?.deleted_at);
}
