// finalize 済みスクリムを D1 へ保存するための snapshot DTO 変換。
// localStorage の `ScrimState` (zustand) から API で送る純粋な JSON 表現を作る。
//
// 識別子は SFL 公式英語表記由来 (first / second / third / tiebreak)。詳細は docs/sfl-rules.md。

import type { ScrimState } from "@/store/scrim";

export interface ScrimSnapshotPlayer {
  side: "home" | "away";
  position: "first" | "second" | "third" | "sub";
  displayName: string;
  characterId: number | null;
  controlType: "classic" | "modern" | null;
}

export interface ScrimSnapshotMatch {
  roundNo: number;
  position: "first" | "second" | "third" | "tiebreak";
  winnerSide: "home" | "away";
  points: number;
}

export interface ScrimSnapshot {
  id: string;
  format: "regular" | "playoff" | "final";
  teamHomeName: string | null;
  teamAwayName: string | null;
  createdAt: number; // Unix seconds
  finalizedAt: number; // Unix seconds
  players: ScrimSnapshotPlayer[];
  matches: ScrimSnapshotMatch[];
}

export function toUnixSec(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
}

export function serializeScrim(scrim: ScrimState, finalizedAt: Date = new Date()): ScrimSnapshot {
  return {
    id: scrim.id,
    format: scrim.format,
    teamHomeName: scrim.teams.home.name?.trim() || null,
    teamAwayName: scrim.teams.away.name?.trim() || null,
    createdAt: toUnixSec(scrim.createdAt),
    finalizedAt: Math.floor(finalizedAt.getTime() / 1000),
    // 名前空白でも committed か character 指定済なら slot を残す（試合の片側だけ消えると
    // scrim_matches.position に対応する scrim_users が無くなり履歴表示が壊れる）。
    players: (["home", "away"] as const).flatMap((side) =>
      scrim.teams[side].players
        .filter((p) => p.name?.trim() || p.committed || p.characterId !== undefined)
        .map<ScrimSnapshotPlayer>((p) => ({
          side,
          position: p.position,
          displayName: p.name?.trim() || `${side} ${p.position}`,
          characterId: p.characterId ?? null,
          controlType: p.controlType ?? null,
        })),
    ),
    matches: scrim.matches
      .filter((m): m is typeof m & { winnerSide: "home" | "away" } => Boolean(m.winnerSide))
      .map((m) => ({
        roundNo: m.roundNo,
        position: m.position,
        winnerSide: m.winnerSide,
        points: m.points,
      })),
  };
}
