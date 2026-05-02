-- SFScrim — Better Auth + v2 schema (issue #82)
--
-- 0001_init.sql の旧テーブル（vanguard/midfield/champion 命名、Better Auth 非対応）を
-- 完全に置き換える。本番 D1 (sfscrim-db) にも 0001 適用済だが、
-- アプリ層から一度も読み書きしていない（src/lib/db.ts は定義のみ、呼び出し 0）ため
-- DROP しても実データ消失なし。
--
-- 設計参照:
--   docs/sfl-rules.md         位置識別子は first / second / third / tiebreak
--   issue #82                 Mock auth + D1 履歴連動の確定 schema
--   Better Auth 1.6.x         user / session / account / verification（singular, snake_case 列）
--
-- 注意:
--   timestamps は Better Auth の整合性のため Unix 秒（INTEGER）で保持する。
--   drizzle-orm の integer({ mode: 'timestamp' }) はこの形式と互換。

-- 1. 旧 schema を破棄（依存順 = matches → players → teams → scrims → users）
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS scrims;
DROP TABLE IF EXISTS users;

-- 2. Better Auth 必須テーブル ------------------------------------------------

CREATE TABLE user (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  image           TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  -- 独自追加: アカウント soft delete（issue #82 PR-C で使用）
  deleted_at      INTEGER
);

CREATE TABLE session (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  expires_at      INTEGER NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX idx_session_user_id ON session(user_id);

CREATE TABLE account (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  account_id                  TEXT NOT NULL,
  provider_id                 TEXT NOT NULL,
  access_token                TEXT,
  refresh_token               TEXT,
  id_token                    TEXT,
  access_token_expires_at     INTEGER,
  refresh_token_expires_at    INTEGER,
  scope                       TEXT,
  password                    TEXT,
  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL
);

CREATE INDEX idx_account_user_id ON account(user_id);

CREATE TABLE verification (
  id              TEXT PRIMARY KEY,
  identifier      TEXT NOT NULL,
  value           TEXT NOT NULL,
  expires_at      INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX idx_verification_identifier ON verification(identifier);

-- 3. SFScrim アプリテーブル v2（識別子: first / second / third / tiebreak）

CREATE TABLE scrims (
  id                TEXT PRIMARY KEY,
  created_by        TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  format            TEXT NOT NULL CHECK (format IN ('regular','playoff','final')),
  status            TEXT NOT NULL CHECK (status IN ('finished')),
  team_home_name    TEXT,
  team_away_name    TEXT,
  created_at        INTEGER NOT NULL,
  finalized_at      INTEGER NOT NULL,
  deleted_at        INTEGER
);

-- created_by + finalized_at 降順検索が /history のホット path。
-- soft delete された scrim は表示しないので partial index で除外し index を小さく保つ。
CREATE INDEX idx_scrims_created_by ON scrims(created_by, finalized_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE scrim_users (
  scrim_id        TEXT NOT NULL REFERENCES scrims(id) ON DELETE CASCADE,
  user_id         TEXT REFERENCES user(id) ON DELETE SET NULL,
  side            TEXT NOT NULL CHECK (side IN ('home','away')),
  position        TEXT NOT NULL CHECK (position IN ('first','second','third','sub')),
  display_name    TEXT NOT NULL,
  character_id    INTEGER,
  control_type    TEXT CHECK (control_type IN ('classic','modern')),
  PRIMARY KEY (scrim_id, side, position)
);

-- ログインユーザーが関わった scrim 検索用（user_id が NULL のゲスト行は対象外）
CREATE INDEX idx_scrim_users_user_id ON scrim_users(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE scrim_matches (
  scrim_id        TEXT NOT NULL REFERENCES scrims(id) ON DELETE CASCADE,
  round_no        INTEGER NOT NULL,
  position        TEXT NOT NULL CHECK (position IN ('first','second','third','tiebreak')),
  winner_side     TEXT NOT NULL CHECK (winner_side IN ('home','away')),
  points          INTEGER NOT NULL,
  PRIMARY KEY (scrim_id, round_no, position)
);
