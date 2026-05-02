"use client";

import { useTranslations, useLocale } from "next-intl";
import { getCharacterName } from "@/config/characters";
import type { Team, Player } from "@/store/scrim";
import { isPositionCommittedAt } from "@/lib/order-state";

import { BATTLE_POSITIONS, SFL_RULES, type PlayerSlot } from "@/config/sfl-rules";

const POSITION_ORDER: ReadonlyArray<PlayerSlot> = [...BATTLE_POSITIONS, "sub"];

// sub は延長戦員の選手登録なので format は SFL_RULES.position.tiebreak と同じ
const POSITION_FORMAT: Record<PlayerSlot, string> = {
  ...Object.fromEntries(
    BATTLE_POSITIONS.map((p) => [p, SFL_RULES.position[p].format]),
  ),
  sub: SFL_RULES.position.tiebreak.format,
} as Record<PlayerSlot, string>;

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
  // ホーム側で未発表ポジは戦略情報なので player の中身を伏せる
  const maskUnannounced = team.side === "home";

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
          const announced = isPositionCommittedAt(team.players, pos);
          const visible = !maskUnannounced || announced;
          return (
            <PositionRow
              key={pos}
              position={pos}
              player={byPosition.get(pos)}
              visible={visible}
              locale={locale}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );
}

function PositionRow({
  position,
  player,
  visible,
  locale,
  t,
}: {
  position: PlayerSlot;
  player: Player | undefined;
  visible: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations<"Order">>;
}) {
  const playerName = visible ? player?.name?.trim() : undefined;
  const characterLabel =
    visible && player?.characterId !== undefined
      ? getCharacterName(player.characterId, locale)
      : "—";
  const showControl = visible && player?.controlType;

  const namePlaceholder = visible ? t("emptySlot") : t("notAnnounced");

  return (
    <div className="flex items-center justify-between bg-bg-2 px-4 py-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t(`positions.${position}`)} · {POSITION_FORMAT[position]}
        </div>
        <div className="mt-1 font-display text-base font-semibold">
          {playerName || namePlaceholder}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {characterLabel}
        </div>
        {showControl && player?.controlType && (
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            {t(`controlTypes.${player.controlType}`)}
          </div>
        )}
      </div>
    </div>
  );
}
