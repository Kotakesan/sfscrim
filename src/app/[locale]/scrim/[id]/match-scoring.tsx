"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  REGULAR_BATTLE_ORDER,
  findRound1Match,
  nextRegularBattle,
  pointsFor,
  regularSeasonOutcome,
} from "@/lib/scoring";
import { SFL_RULES, type BattlePosition } from "@/config/sfl-rules";
import {
  useScrimStore,
  type MatchRecord,
  type ScrimState,
  type Side,
} from "@/store/scrim";
import { formatPlayerLabel } from "@/lib/player-format";
import { findPlayer, isPositionCommittedAt } from "@/lib/order-state";
import { LiveDashboard } from "./live-dashboard";

export function RegularSeasonScoring({ scrim }: { scrim: ScrimState }) {
  const t = useTranslations("Score");
  const recordMatch = useScrimStore((s) => s.recordMatch);
  const undoLast = useScrimStore((s) => s.undoLastMatch);
  const setStatus = useScrimStore((s) => s.setStatus);

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

      <LiveDashboard scrim={scrim} />

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
  const tOrder = useTranslations("Order");
  const locale = useLocale();
  const commitPosition = useScrimStore((s) => s.commitPosition);
  const recorded = findRound1Match(scrim.matches, position);
  const points = pointsFor(position);
  const format = SFL_RULES.position[position].format;
  const homePlayer = findPlayer(scrim.teams.home.players, position);
  const awayPlayer = findPlayer(scrim.teams.away.players, position);
  const homeAnnounced = isPositionCommittedAt(scrim.teams.home.players, position);
  const awaitingHome = isNext && !recorded && !homeAnnounced;
  const empty = t("emptyPlayer");
  const disabled = !isNext || Boolean(recorded) || awaitingHome;

  return (
    <div
      className={`border bg-bg-2 p-4 ${
        awaitingHome ? "border-accent" : "border-line"
      }`}
    >
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
          {!recorded && isNext && !awaitingHome && (
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              ● {t("nextLabel")}
            </span>
          )}
          {awaitingHome && (
            <Link
              href={`/scrim/${scrim.id}/order/home`}
              className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent underline decoration-2 underline-offset-4 hover:text-ink"
            >
              ●{" "}
              {t("homeNotCommitted", {
                position: t(`positions.${position}`),
              })}
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_1fr]">
        <BattlePlayer
          name={
            homeAnnounced
              ? formatPlayerLabel(homePlayer, locale, empty)
              : tOrder("notAnnounced")
          }
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

      {awaitingHome && homePlayer && homePlayer.name.trim().length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => commitPosition(scrim.id, "home", position)}
            className="inline-flex h-9 items-center border-2 border-accent bg-accent px-4 font-display text-xs font-semibold text-bg transition-colors hover:border-ink hover:bg-ink"
          >
            {tOrder("announceCta", {
              position: tOrder(`positions.${position}`),
            })}
          </button>
        </div>
      )}
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
  const homeSub = scrim.teams.home.players.find((p) => p.position === "sub");
  const awaySub = scrim.teams.away.players.find((p) => p.position === "sub");
  const empty = t("emptyPlayer");

  const winnerSide = recorded?.winnerSide;
  const locked = winnerSide !== undefined;
  const ready = Boolean(homeSub && awaySub);
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
          ) : !ready ? (
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              ● {t("tiebreakSubMissing")}
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_1fr]">
        <BattlePlayer
          name={formatPlayerLabel(homeSub, locale, empty)}
          side="home"
          isWinner={winnerSide === "home"}
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
        <BattlePlayer
          name={formatPlayerLabel(awaySub, locale, empty)}
          side="away"
          isWinner={winnerSide === "away"}
        />
      </div>
    </div>
  );
}
