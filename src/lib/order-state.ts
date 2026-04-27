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

export function isMainBattleCommitted(players: Player[]): boolean {
  return BATTLE_POSITIONS.every((pos) => {
    const player = findPlayer(players, pos);
    return player ? isPositionCommitted(player) : false;
  });
}

export function isOrderComplete(scrim: ScrimState): boolean {
  return (["home", "away"] as const).every((side) =>
    isMainBattleCommitted(scrim.teams[side].players),
  );
}
