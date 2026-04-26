"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  REGULAR_BATTLE_ORDER,
  findRound1Match,
  nextRegularBattle,
  pointsFor,
  regularSeasonOutcome,
  tallyScore,
} from "@/lib/scoring";
import { SFL_RULES, type BattlePosition } from "@/config/sfl-rules";
import { getCharacterName } from "@/config/characters";
import {
  useScrimStore,
  type MatchRecord,
  type Player,
  type ScrimState,
  type Side,
} from "@/store/scrim";

function formatPlayerLabel(
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

export function RegularSeasonScoring({ scrim }: { scrim: ScrimState }) {
  const t = useTranslations("Score");
  const recordMatch = useScrimStore((s) => s.recordMatch);
  const undoLast = useScrimStore((s) => s.undoLastMatch);
  const setStatus = useScrimStore((s) => s.setStatus);

  const score = tallyScore(scrim.matches);
  const next = nextRegularBattle(scrim.matches);
  const outcome = regularSeasonOutcome(scrim);
  const lastMatch = scrim.matches[scrim.matches.length - 1];
  const tiebreakMatch = findRound1Match(scrim.matches, "tiebreak");
  const showTiebreakRow = outcome.kind === "tied" || Boolean(tiebreakMatch);

  const onWin = (position: BattlePosition, winnerSide: Side) => {
    recordMatch(scrim.id, {
      roundNo: 1,
      position,
      winnerSide,
      points: pointsFor(position),
    });
  };

  const onWinTiebreak = (winnerSide: Side) => {
    recordMatch(scrim.id, {
      roundNo: 1,
      position: "tiebreak",
      winnerSide,
      points: SFL_RULES.position.tiebreak.points,
    });
  };

  const onUndo = () => {
    undoLast(scrim.id);
    if (scrim.status === "finished") setStatus(scrim.id, "in_progress");
  };

  const onFinalize = () => setStatus(scrim.id, "finished");

  return (
    <section className="mt-12">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
        {t("sectionTag")}
      </div>
      <h2 className="mb-2 font-display text-3xl font-bold tracking-[-0.01em]">
        {t("sectionTitle")}
      </h2>
      <p className="mb-6 max-w-2xl font-mono text-xs leading-relaxed text-muted">
        {t("regularDescription", {
          max: SFL_RULES.format.regular.maxPoints,
          tiebreak: SFL_RULES.position.tiebreak.points,
        })}
      </p>

      <Scoreboard
        homeName={scrim.teams.home.name}
        awayName={scrim.teams.away.name}
        score={score}
        outcome={outcome}
        scrim={scrim}
      />

      <div className="mt-6 grid gap-3">
        {REGULAR_BATTLE_ORDER.map((pos) => (
          <BattleRow
            key={pos}
            scrim={scrim}
            position={pos}
            isNext={next === pos}
            onWin={onWin}
          />
        ))}
        {showTiebreakRow && (
          <TiebreakRow
            scrim={scrim}
            recorded={tiebreakMatch}
            onWin={onWinTiebreak}
          />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={onUndo}
          disabled={scrim.matches.length === 0}
          className="inline-flex h-11 items-center border-2 border-line bg-transparent px-5 font-display text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("undoLast", { ...lastMatchTokens(lastMatch, t) })}
        </button>

        {outcome.kind === "decided" && scrim.status === "in_progress" && (
          <button
            type="button"
            onClick={onFinalize}
            className="inline-flex h-11 items-center border-2 border-accent bg-accent px-5 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink"
          >
            {t("finalize")}
          </button>
        )}

        {outcome.kind === "tied" && (
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
            {t("tieDetectedHint", {
              tiebreak: SFL_RULES.position.tiebreak.points,
            })}
          </span>
        )}
      </div>
    </section>
  );
}

function lastMatchTokens(
  m: { position: string; winnerSide?: string } | undefined,
  t: ReturnType<typeof useTranslations<"Score">>,
): { detail: string } {
  if (!m || !m.winnerSide) return { detail: t("undoLastNone") };
  return {
    detail: t("undoLastDetail", {
      position: t(`positions.${m.position as BattlePosition | "tiebreak"}`),
      winner: t(`sides.${m.winnerSide as Side}`),
    }),
  };
}

function Scoreboard({
  homeName,
  awayName,
  score,
  outcome,
  scrim,
}: {
  homeName: string;
  awayName: string;
  score: { home: number; away: number };
  outcome: ReturnType<typeof regularSeasonOutcome>;
  scrim: ScrimState;
}) {
  const t = useTranslations("Score");
  const max = SFL_RULES.format.regular.maxPoints;
  const leadingSide: Side | undefined =
    outcome.kind === "decided"
      ? outcome.winner
      : score.home === score.away
        ? undefined
        : score.home > score.away
          ? "home"
          : "away";

  return (
    <div className="border-2 border-ink bg-bg">
      <div className="flex items-center justify-between border-b border-line bg-bg-3 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
        <span>{t("scoreboardTitle")}</span>
        <span>
          {t("statusLabel")}:{" "}
          <b className="text-accent">
            {t(`outcomeStatus.${outcome.kind}`)}
            {outcome.kind === "decided" &&
              ` · ${t("winnerSuffix", { name: outcome.winner === "home" ? homeName : awayName })}`}
          </b>
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 p-7 text-center">
        <ScoreCell name={homeName} value={score.home} max={max} highlighted={leadingSide === "home"} />
        <span className="font-mono text-xl text-muted">vs</span>
        <ScoreCell name={awayName} value={score.away} max={max} highlighted={leadingSide === "away"} />
      </div>
      <MatchHistory scrim={scrim} />
    </div>
  );
}

function ScoreCell({
  name,
  value,
  max,
  highlighted,
}: {
  name: string;
  value: number;
  max: number;
  highlighted: boolean;
}) {
  const t = useTranslations("Score");
  return (
    <div>
      <div className="font-display text-xl font-bold tracking-[-0.01em]">
        {name || t("teamUnnamed")}
      </div>
      <div
        className={`mt-2 font-display text-7xl font-extrabold leading-none tracking-[-0.03em] ${
          highlighted ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        / {max}
      </div>
    </div>
  );
}

function MatchHistory({ scrim }: { scrim: ScrimState }) {
  const t = useTranslations("Score");
  if (scrim.matches.length === 0) return null;

  return (
    <div className="border-t border-line">
      <div className="grid grid-cols-4 gap-2 border-b border-line bg-bg-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        <span>{t("historyHeaders.position")}</span>
        <span>{t("historyHeaders.format")}</span>
        <span>{t("historyHeaders.winner")}</span>
        <span className="text-right">{t("historyHeaders.points")}</span>
      </div>
      {scrim.matches.map((m, i) => {
        const pos = m.position as BattlePosition | "tiebreak";
        return (
          <div
            key={`${m.roundNo}-${m.position}-${i}`}
            className="grid grid-cols-4 gap-2 px-4 py-2 font-mono text-xs"
          >
            <span className="text-ink-2">{t(`positions.${pos}`)}</span>
            <span className="text-muted">{SFL_RULES.position[pos].format}</span>
            <span className="text-ink-2">
              {m.winnerSide
                ? t(`sides.${m.winnerSide}`)
                : t("noWinner")}
            </span>
            <span className="text-right font-bold text-accent">
              +{m.points}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BattleRow({
  scrim,
  position,
  isNext,
  onWin,
}: {
  scrim: ScrimState;
  position: BattlePosition;
  isNext: boolean;
  onWin: (position: BattlePosition, side: Side) => void;
}) {
  const t = useTranslations("Score");
  const locale = useLocale();
  const recorded = findRound1Match(scrim.matches, position);
  const points = pointsFor(position);
  const format = SFL_RULES.position[position].format;
  const homePlayer = scrim.teams.home.players.find(
    (p) => p.position === position,
  );
  const awayPlayer = scrim.teams.away.players.find(
    (p) => p.position === position,
  );
  const empty = t("emptyPlayer");
  const disabled = !isNext || Boolean(recorded);

  return (
    <div className="border border-line bg-bg-2 p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {t(`positions.${position}`)} · {format} · +{points}pt
          </span>
          {recorded?.winnerSide && (
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              ● {t(`sides.${recorded.winnerSide}`)} {t("wonSuffix")}
            </span>
          )}
          {!recorded && isNext && (
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              ● {t("nextLabel")}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_1fr]">
        <BattlePlayer
          name={formatPlayerLabel(homePlayer, locale, empty)}
          side="home"
          isWinner={recorded?.winnerSide === "home"}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onWin(position, "home")}
            disabled={disabled}
            className="h-9 w-full border-2 border-ink bg-transparent font-display text-xs font-semibold transition-colors hover:bg-ink hover:text-bg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            ← {t("homeWins")}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            vs
          </span>
          <button
            type="button"
            onClick={() => onWin(position, "away")}
            disabled={disabled}
            className="h-9 w-full border-2 border-ink bg-transparent font-display text-xs font-semibold transition-colors hover:bg-ink hover:text-bg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            {t("awayWins")} →
          </button>
        </div>
        <BattlePlayer
          name={formatPlayerLabel(awayPlayer, locale, empty)}
          side="away"
          isWinner={recorded?.winnerSide === "away"}
        />
      </div>
    </div>
  );
}

function BattlePlayer({
  name,
  side,
  isWinner,
}: {
  name: string;
  side: Side;
  isWinner: boolean;
}) {
  const t = useTranslations("Score");
  return (
    <div
      className={`border ${
        isWinner ? "border-accent bg-accent-soft" : "border-line bg-bg"
      } px-4 py-3`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {t(`sides.${side}`)}
      </div>
      <div
        className={`mt-1 font-display text-base font-semibold ${
          isWinner ? "text-accent" : "text-ink"
        }`}
      >
        {name}
      </div>
    </div>
  );
}

function TiebreakRow({
  scrim,
  recorded,
  onWin,
}: {
  scrim: ScrimState;
  recorded: MatchRecord | undefined;
  onWin: (winner: Side) => void;
}) {
  const t = useTranslations("Score");
  const locale = useLocale();
  const points = SFL_RULES.position.tiebreak.points;
  const format = SFL_RULES.position.tiebreak.format;
  const homePlayers = scrim.teams.home.players;
  const awayPlayers = scrim.teams.away.players;
  const empty = t("emptyPlayer");

  const [homeIdx, setHomeIdx] = useState<number | undefined>(undefined);
  const [awayIdx, setAwayIdx] = useState<number | undefined>(undefined);

  const ready = homeIdx !== undefined && awayIdx !== undefined;
  const winnerSide = recorded?.winnerSide;
  const locked = winnerSide !== undefined;
  const disabled = locked || !ready;

  return (
    <div className="border border-accent bg-accent-soft p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {t("positions.tiebreak")} · {format} · +{points}pt
          </span>
          {winnerSide ? (
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              ● {t(`sides.${winnerSide}`)} {t("wonSuffix")}
            </span>
          ) : (
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              ● {t("tiebreakPickHint")}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_1fr]">
        <TiebreakPlayerPicker
          side="home"
          players={homePlayers}
          selectedIdx={homeIdx}
          onChange={setHomeIdx}
          isWinner={winnerSide === "home"}
          locked={locked}
          locale={locale}
          empty={empty}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onWin("home")}
            disabled={disabled}
            className="h-9 w-full border-2 border-ink bg-transparent font-display text-xs font-semibold transition-colors hover:bg-ink hover:text-bg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            ← {t("homeWins")}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            vs
          </span>
          <button
            type="button"
            onClick={() => onWin("away")}
            disabled={disabled}
            className="h-9 w-full border-2 border-ink bg-transparent font-display text-xs font-semibold transition-colors hover:bg-ink hover:text-bg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            {t("awayWins")} →
          </button>
        </div>
        <TiebreakPlayerPicker
          side="away"
          players={awayPlayers}
          selectedIdx={awayIdx}
          onChange={setAwayIdx}
          isWinner={winnerSide === "away"}
          locked={locked}
          locale={locale}
          empty={empty}
        />
      </div>
    </div>
  );
}

function TiebreakPlayerPicker({
  side,
  players,
  selectedIdx,
  onChange,
  isWinner,
  locked,
  locale,
  empty,
}: {
  side: Side;
  players: Player[];
  selectedIdx: number | undefined;
  onChange: (idx: number | undefined) => void;
  isWinner: boolean;
  locked: boolean;
  locale: string;
  empty: string;
}) {
  const t = useTranslations("Score");
  const tOrder = useTranslations("Order");
  const selectedLabel = formatPlayerLabel(
    selectedIdx !== undefined ? players[selectedIdx] : undefined,
    locale,
    empty,
  );
  return (
    <div
      className={`border ${
        isWinner ? "border-accent bg-accent-soft" : "border-line bg-bg"
      } px-4 py-3`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {t(`sides.${side}`)}
      </div>
      {locked ? (
        <div
          className={`mt-1 font-display text-base font-semibold ${
            isWinner ? "text-accent" : "text-ink"
          }`}
        >
          {selectedLabel}
        </div>
      ) : (
        <select
          value={selectedIdx ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : Number(v));
          }}
          className="mt-1 w-full bg-transparent font-display text-base font-semibold text-ink focus:outline-none"
        >
          <option value="">{t("tiebreakPickPlaceholder")}</option>
          {players.map((p, i) => (
            <option key={`${p.name}-${i}`} value={i}>
              {formatPlayerLabel(p, locale, empty)} · {tOrder(`positions.${p.position}`)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
