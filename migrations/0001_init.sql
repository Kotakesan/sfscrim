-- SFScrim 初期スキーマ
-- 参照: docs/sfl-rules.md / Issue #1
--
-- 設計メモ:
--  - 各 ID は UUIDv4 を想定（アプリ層で発行）。SQLite の AUTOINCREMENT は使わない。
--  - timestamps は unix epoch（秒）。SQLite の `unixepoch()` で生成。
--  - SFL ルール上の定数値（先取 pt 等）はここに保存しない。設定値（src/config）参照。
--  - matches.points は「その対戦で実際に動いたポイント数」を記録（履歴用）。
--    ルール定数のスナップショットではなく、計算結果を入れる。

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
  provider_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (provider, provider_id)
);

CREATE TABLE scrims (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  format        TEXT NOT NULL CHECK (format IN ('regular', 'playoff', 'final')),
  status        TEXT NOT NULL CHECK (status IN ('draft', 'in_progress', 'finished')),
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_scrims_owner_id ON scrims(owner_id);
CREATE INDEX idx_scrims_status ON scrims(status);

CREATE TABLE teams (
  id              TEXT PRIMARY KEY,
  scrim_id        TEXT NOT NULL REFERENCES scrims(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  side            TEXT NOT NULL CHECK (side IN ('home', 'away')),
  order_position  INTEGER NOT NULL CHECK (order_position BETWEEN 1 AND 3),
  UNIQUE (scrim_id, side)
);
-- scrim_id 単独の検索は UNIQUE(scrim_id, side) の leftmost prefix でカバーされる

CREATE TABLE players (
  id          TEXT PRIMARY KEY,
  team_id     TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    TEXT NOT NULL CHECK (position IN ('vanguard', 'midfield', 'champion', 'sub')),
  character   TEXT
);

CREATE INDEX idx_players_team_id ON players(team_id);

CREATE TABLE matches (
  id              TEXT PRIMARY KEY,
  scrim_id        TEXT NOT NULL REFERENCES scrims(id) ON DELETE CASCADE,
  round_no        INTEGER NOT NULL CHECK (round_no >= 1),
  position        TEXT NOT NULL CHECK (position IN ('vanguard', 'midfield', 'champion', 'tiebreak')),
  winner_team_id  TEXT REFERENCES teams(id) ON DELETE SET NULL,
  points          INTEGER NOT NULL CHECK (points >= 0),
  created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX idx_matches_scrim_round_position ON matches(scrim_id, round_no, position);
-- winner_team_id は ON DELETE SET NULL のため参照側スキャン回避用に index を張る
CREATE INDEX idx_matches_winner_team_id ON matches(winner_team_id);
-- scrim_id 単独の検索は idx_matches_scrim_round_position の leftmost prefix でカバーされる
