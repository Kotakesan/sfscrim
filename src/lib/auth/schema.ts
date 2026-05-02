// drizzle schema for Better Auth + SFScrim v2 tables.
// camelCase キーは Better Auth フィールド名と一致させる必要がある（drizzle-adapter が
// schema[model][camelCaseKey] でアクセスするため）。SQL 列は snake_case。
//
// 対応 migration: migrations/0002_better_auth_and_v2_schema.sql
// position / format 識別子の source-of-truth は src/config/sfl-rules.ts。

import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { BATTLE_POSITIONS, SFL_RULES } from "@/config/sfl-rules";

const PLAYER_SLOTS = [...BATTLE_POSITIONS, "sub"] as const;
const MATCH_POSITIONS = [...BATTLE_POSITIONS, "tiebreak"] as const;
const FORMAT_MODES = Object.keys(SFL_RULES.format) as Array<keyof typeof SFL_RULES.format>;

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userIdx: index("idx_session_user_id").on(t.userId),
  }),
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userIdx: index("idx_account_user_id").on(t.userId),
  }),
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    identifierIdx: index("idx_verification_identifier").on(t.identifier),
  }),
);

// SFScrim アプリテーブル v2 ----------------------------------------------------

export const scrims = sqliteTable(
  "scrims",
  {
    id: text("id").primaryKey(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    format: text("format", { enum: FORMAT_MODES as [string, ...string[]] }).notNull(),
    status: text("status", { enum: ["finished"] }).notNull(),
    teamHomeName: text("team_home_name"),
    teamAwayName: text("team_away_name"),
    createdAt: integer("created_at").notNull(),
    finalizedAt: integer("finalized_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (t) => ({
    createdByIdx: index("idx_scrims_created_by").on(t.createdBy, t.finalizedAt),
  }),
);

export const scrimUsers = sqliteTable(
  "scrim_users",
  {
    scrimId: text("scrim_id")
      .notNull()
      .references(() => scrims.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    side: text("side", { enum: ["home", "away"] }).notNull(),
    position: text("position", { enum: PLAYER_SLOTS }).notNull(),
    displayName: text("display_name").notNull(),
    characterId: integer("character_id"),
    controlType: text("control_type", { enum: ["classic", "modern"] }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scrimId, t.side, t.position] }),
    userIdx: index("idx_scrim_users_user_id").on(t.userId),
  }),
);

export const scrimMatches = sqliteTable(
  "scrim_matches",
  {
    scrimId: text("scrim_id")
      .notNull()
      .references(() => scrims.id, { onDelete: "cascade" }),
    roundNo: integer("round_no").notNull(),
    position: text("position", { enum: MATCH_POSITIONS }).notNull(),
    winnerSide: text("winner_side", { enum: ["home", "away"] }).notNull(),
    points: integer("points").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scrimId, t.roundNo, t.position] }),
  }),
);

export const authSchema = { user, session, account, verification };
