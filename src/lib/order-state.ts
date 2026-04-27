import type { Player, ScrimState, Side } from "@/store/scrim";
import { BATTLE_POSITIONS, type PlayerSlot } from "@/config/sfl-rules";

export const ROLES: ReadonlyArray<Side> = ["away", "home"];

export function isRole(value: string): value is Side {
  return (ROLES as ReadonlyArray<string>).includes(value);
}

export const roleStorageKey = (scrimId: string): string =>
  `sfscrim:role:${scrimId}`;

// committed が未指定（旧 schema）の場合は name の有無で判定する後方互換挙動
export function isPositionCommitted(player: Player): boolean {
  if (player.committed === true) return true;
  if (player.committed === false) return false;
  return player.name.trim().length > 0;
}

export function findPlayer(
  players: Player[],
  position: PlayerSlot,
): Player | undefined {
  return players.find((p) => p.position === position);
}

// 該当ポジに player があり、かつ committed と判定されるかをまとめて返す
export function isPositionCommittedAt(
  players: Player[],
  position: PlayerSlot,
): boolean {
  const player = findPlayer(players, position);
  return player ? isPositionCommitted(player) : false;
}

export function isMainBattleCommitted(players: Player[]): boolean {
  return BATTLE_POSITIONS.every((pos) => isPositionCommittedAt(players, pos));
}

// ホーム側で「先鋒だけ確定済」を判定する。SFL のホーム逐次申告フローでは、
// ホームは先鋒さえ発表されれば試合開始可（中堅・大将は試合進行中に逐次発表）。
export function isHomeReadyToStart(players: Player[]): boolean {
  return isPositionCommittedAt(players, "vanguard");
}

export function isOrderComplete(scrim: ScrimState): boolean {
  // アウェイは事前一括（main 3 ポジ全部）、ホームは先鋒のみで開始可
  return (
    isMainBattleCommitted(scrim.teams.away.players) &&
    isHomeReadyToStart(scrim.teams.home.players)
  );
}
