import type { Player, ScrimState, Side } from "@/store/scrim";

export const ROLES: ReadonlyArray<Side> = ["away", "home"];

export function isRole(value: string): value is Side {
  return (ROLES as ReadonlyArray<string>).includes(value);
}

export const roleStorageKey = (scrimId: string): string =>
  `sfscrim:role:${scrimId}`;

export function isMainBattleCommitted(players: Player[]): boolean {
  return (["vanguard", "midfield", "champion"] as const).every((pos) =>
    players.some((p) => p.position === pos && p.name.trim().length > 0),
  );
}

export function isOrderComplete(scrim: ScrimState): boolean {
  return (["home", "away"] as const).every((side) =>
    isMainBattleCommitted(scrim.teams[side].players),
  );
}
