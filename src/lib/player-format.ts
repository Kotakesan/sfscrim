import { getCharacterName } from "@/config/characters";
import type { Player } from "@/store/scrim";

export function formatPlayerLabel(
  p: Player | undefined,
  locale: string,
  fallback: string,
): string {
  if (!p) return fallback;
  const char =
    p.characterId !== undefined
      ? ` · ${getCharacterName(p.characterId, locale)}`
      : "";
  return `${p.name}${char}`;
}
