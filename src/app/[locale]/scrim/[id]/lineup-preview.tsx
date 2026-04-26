"use client";

import { useTranslations, useLocale } from "next-intl";
import { getCharacterName } from "@/config/characters";
import type { Team } from "@/store/scrim";

import type { PlayerSlot } from "@/config/sfl-rules";

const POSITION_ORDER: ReadonlyArray<PlayerSlot> = [
  "vanguard",
  "midfield",
  "champion",
  "sub",
];

const POSITION_FORMAT: Record<PlayerSlot, string> = {
  vanguard: "Bo3",
  midfield: "Bo3",
  champion: "Bo5",
  sub: "—",
};

export function LineupPreview({ home, away }: { home: Team; away: Team }) {
  const t = useTranslations("Order");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TeamLineup team={home} t={t} />
      <TeamLineup team={away} t={t} />
    </div>
  );
}

function TeamLineup({
  team,
  t,
}: {
  team: Team;
  t: ReturnType<typeof useTranslations<"Order">>;
}) {
  const locale = useLocale();
  const byPosition = new Map(team.players.map((p) => [p.position, p]));

  return (
    <div className="border border-ink bg-bg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          {t(`sides.${team.side}`)}
        </span>
        <span className="font-display text-base font-bold tracking-[-0.01em]">
          {team.name || t("unsetTeamName")}
        </span>
      </div>
      <div className="divide-y divide-line">
        {POSITION_ORDER.map((pos) => {
          const p = byPosition.get(pos);
          return (
            <div
              key={pos}
              className="flex items-center justify-between bg-bg-2 px-4 py-3"
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {t(`positions.${pos}`)} · {POSITION_FORMAT[pos]}
                </div>
                <div className="mt-1 font-display text-base font-semibold">
                  {p?.name?.trim()
                    ? p.name
                    : t("emptySlot")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {p?.characterId !== undefined
                    ? getCharacterName(p.characterId, locale)
                    : "—"}
                </div>
                {p?.controlType && (
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                    {t(`controlTypes.${p.controlType}`)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
