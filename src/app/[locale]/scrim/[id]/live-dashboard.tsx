"use client";

import type { ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  REGULAR_BATTLE_ORDER,
  nextRegularBattle,
  pointsFor,
  regularSeasonOutcome,
  tallyScore,
  type RegularSeasonOutcome,
} from "@/lib/scoring";
import { formatPlayerLabel } from "@/lib/player-format";
import { isPositionCommittedAt } from "@/lib/order-state";
import {
  SFL_RULES,
  type BattlePosition,
  type MatchPosition,
} from "@/config/sfl-rules";
import type { MatchRecord, ScrimState, Side } from "@/store/scrim";

type MatchIndex = ReadonlyMap<MatchPosition, MatchRecord>;

type PositionRowState =
  | { kind: "won"; pts: number }
  | { kind: "lost" }
  | { kind: "next"; pts: number }
  | { kind: "pending" };

function buildMatchIndex(matches: ReadonlyArray<MatchRecord>): MatchIndex {
  return new Map(
    matches.filter((m) => m.roundNo === 1).map((m) => [m.position, m]),
  );
}

function rowStateFor(
  side: Side,
  position: BattlePosition,
  matchIndex: MatchIndex,
  next: BattlePosition | undefined,
): PositionRowState {
  const recorded = matchIndex.get(position);
  if (recorded?.winnerSide === side) return { kind: "won", pts: recorded.points };
  if (recorded?.winnerSide && recorded.winnerSide !== side) return { kind: "lost" };
  if (next === position) return { kind: "next", pts: pointsFor(position) };
  return { kind: "pending" };
}

function leadingSideFor(
  outcome: RegularSeasonOutcome,
  score: { home: number; away: number },
): Side | undefined {
  if (outcome.kind === "decided") return outcome.winner;
  if (score.home === score.away) return undefined;
  return score.home > score.away ? "home" : "away";
}

export function LiveDashboard({
  scrim,
  interactive = true,
}: {
  scrim: ScrimState;
  /** false なら配信ビュー等で操作 UI（未発表ポジから入力画面へのリンク等）を出さない */
  interactive?: boolean;
}) {
  const t = useTranslations("Score");

  const matchIndex = buildMatchIndex(scrim.matches);
  const score = tallyScore(scrim.matches);
  const outcome = regularSeasonOutcome(scrim);
  const next = nextRegularBattle(scrim.matches);
  const leadingSide = leadingSideFor(outcome, score);

  const liveLabel = pickLiveLabel(t, outcome, scrim.status);
  const winnerTeamName =
    outcome.kind === "decided"
      ? scrim.teams[outcome.winner].name || t("teamUnnamed")
      : null;
  const statusTail =
    outcome.kind === "decided"
      ? t("winnerSuffix", { name: winnerTeamName! })
      : outcome.kind === "tied"
        ? t("live.tiebreakLabel")
        : t(`outcomeStatus.${outcome.kind}`);

  return (
    <div className="border-2 border-ink bg-bg">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ink bg-bg-3 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2 sm:justify-between">
        <span className="break-all">
          {t("live.barId", { id: scrim.id })} · {t("live.section")}
        </span>
        <span>
          <b className="text-accent">{liveLabel}</b> · {statusTail}
        </span>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr] md:gap-[18px] md:p-7">
        <ScoreboardPanel
          homeName={scrim.teams.home.name || t("teamUnnamed")}
          awayName={scrim.teams.away.name || t("teamUnnamed")}
          score={score}
          leadingSide={leadingSide}
          matchIndex={matchIndex}
          outcome={outcome}
        />
        <LineupPanel
          scrim={scrim}
          matchIndex={matchIndex}
          next={next}
          interactive={interactive}
        />
      </div>
    </div>
  );
}

function pickLiveLabel(
  t: ReturnType<typeof useTranslations<"Score">>,
  outcome: RegularSeasonOutcome,
  status: ScrimState["status"],
): string {
  if (outcome.kind === "decided") return t("live.liveDone");
  if (status === "in_progress") return t("live.liveOn");
  return t("live.liveOff");
}

function ScoreboardPanel({
  homeName,
  awayName,
  score,
  leadingSide,
  matchIndex,
  outcome,
}: {
  homeName: string;
  awayName: string;
  score: { home: number; away: number };
  leadingSide: Side | undefined;
  matchIndex: MatchIndex;
  outcome: RegularSeasonOutcome;
}) {
  const t = useTranslations("Score");
  const showTiebreakCol = outcome.kind === "tied" || matchIndex.has("tiebreak");

  return (
    <section className="border border-line bg-bg">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted sm:justify-between">
        <span>{t("live.scoreboardTitle")}</span>
        <span>{t("live.scoreboardSubtitle")}</span>
      </div>
      <div className="px-4 py-6 md:px-6 md:py-7">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center md:gap-[18px]">
          <div className="font-display text-lg font-bold tracking-[-0.01em] md:text-[18px]">
            {homeName}
          </div>
          <span className="font-mono text-base text-muted md:text-[22px]">vs</span>
          <div className="font-display text-lg font-bold tracking-[-0.01em] md:text-[18px]">
            {awayName}
          </div>
          <ScoreNumber value={score.home} accent={leadingSide === "home"} />
          <span className="font-mono text-base text-muted md:text-[22px]">·</span>
          <ScoreNumber value={score.away} accent={leadingSide === "away"} />
        </div>

        <div
          className={`mt-5 grid gap-3 border-t border-line pt-4 text-center ${
            showTiebreakCol ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"
          }`}
        >
          {REGULAR_BATTLE_ORDER.map((pos) => (
            <PositionMetaCell key={pos} position={pos} matchIndex={matchIndex} />
          ))}
          {showTiebreakCol && <TiebreakMetaCell matchIndex={matchIndex} />}
        </div>
      </div>
    </section>
  );
}

function ScoreNumber({ value, accent }: { value: number; accent: boolean }) {
  return (
    <span
      className={`font-display font-extrabold leading-none tracking-[-0.03em] text-[64px] md:text-[84px] ${
        accent ? "text-accent" : "text-ink"
      }`}
    >
      {value}
    </span>
  );
}

function MetaCell({
  label,
  recorded,
  pendingNode,
  valueTone,
}: {
  label: string;
  recorded: MatchRecord | undefined;
  pendingNode: ReactNode;
  valueTone: "ink" | "accent";
}) {
  const t = useTranslations("Score");
  const wonSide = recorded?.winnerSide;
  const wonClass = valueTone === "accent" ? "text-accent" : "text-ink";

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-lg font-bold ${wonSide ? wonClass : "text-muted"}`}
      >
        {wonSide
          ? t("live.metaWonBy", {
              side: t(`sides.${wonSide}`),
              pts: recorded!.points,
            })
          : pendingNode}
      </div>
    </div>
  );
}

function PositionMetaCell({
  position,
  matchIndex,
}: {
  position: BattlePosition;
  matchIndex: MatchIndex;
}) {
  const t = useTranslations("Score");
  return (
    <MetaCell
      label={`${t(`positions.${position}`)} (${SFL_RULES.position[position].format})`}
      recorded={matchIndex.get(position)}
      pendingNode={t("live.metaPending")}
      valueTone="ink"
    />
  );
}

function TiebreakMetaCell({ matchIndex }: { matchIndex: MatchIndex }) {
  const t = useTranslations("Score");
  return (
    <MetaCell
      label={t("live.tiebreakLabel")}
      recorded={matchIndex.get("tiebreak")}
      pendingNode={t("live.metaTied", { pts: SFL_RULES.position.tiebreak.points })}
      valueTone="accent"
    />
  );
}

function LineupPanel({
  scrim,
  matchIndex,
  next,
  interactive,
}: {
  scrim: ScrimState;
  matchIndex: MatchIndex;
  next: BattlePosition | undefined;
  interactive: boolean;
}) {
  const t = useTranslations("Score");
  const sides: ReadonlyArray<Side> = ["home", "away"];
  return (
    <section className="border border-line bg-bg">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted sm:justify-between">
        <span>{t("live.lineupTitle")}</span>
        <span>{t("live.lineupSubtitle")}</span>
      </div>
      <div className="space-y-4 p-4 md:p-5">
        {sides.map((side) => (
          <LineupSideBlock
            key={side}
            side={side}
            team={scrim.teams[side]}
            matchIndex={matchIndex}
            next={next}
            scrimId={scrim.id}
            interactive={interactive}
          />
        ))}
      </div>
    </section>
  );
}

function LineupSideBlock({
  side,
  team,
  matchIndex,
  next,
  scrimId,
  interactive,
}: {
  side: Side;
  team: ScrimState["teams"]["home"];
  matchIndex: MatchIndex;
  next: BattlePosition | undefined;
  scrimId: string;
  interactive: boolean;
}) {
  const t = useTranslations("Score");
  const tOrder = useTranslations("Order");
  const locale = useLocale();
  const empty = t("emptyPlayer");
  const teamName = team.name || t("teamUnnamed");
  const playerByPos = new Map(team.players.map((p) => [p.position, p]));
  // ホーム未発表ポジは戦略情報。DOM 自体に player 名を出さず「未発表」だけ表示する
  const maskUnannounced = side === "home";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>{t(`sides.${side}`)}</span>
        <span className="font-display text-xs font-bold text-ink">{teamName}</span>
      </div>
      <div className="space-y-2">
        {REGULAR_BATTLE_ORDER.map((pos) => {
          const announced = isPositionCommittedAt(team.players, pos);
          const visible = !maskUnannounced || announced;
          const name = visible
            ? formatPlayerLabel(playerByPos.get(pos), locale, empty)
            : tOrder("notAnnounced");
          // ホーム未発表ポジは入力画面へのショートカットを出す（broadcast view では出さない）
          const linkHref =
            interactive && maskUnannounced && !announced
              ? `/scrim/${scrimId}/order/home`
              : undefined;
          return (
            <LineupRow
              key={pos}
              position={pos}
              name={name}
              state={rowStateFor(side, pos, matchIndex, next)}
              linkHref={linkHref}
              linkTitle={tOrder("notAnnouncedJumpHint")}
            />
          );
        })}
      </div>
    </div>
  );
}

function rowStatLabel(
  state: PositionRowState,
  t: ReturnType<typeof useTranslations<"Score">>,
): string {
  switch (state.kind) {
    case "won":
      return t("live.rowResultWon", { pts: state.pts });
    case "lost":
      return t("live.rowResultLost");
    case "next":
      return t("live.rowResultNext", { pts: state.pts });
    case "pending":
      return t("live.rowResultPending");
  }
}

function rowStatTone(state: PositionRowState): "accent" | "muted" {
  switch (state.kind) {
    case "won":
    case "next":
      return "accent";
    case "lost":
    case "pending":
      return "muted";
  }
}

function LineupRow({
  position,
  name,
  state,
  linkHref,
  linkTitle,
}: {
  position: BattlePosition;
  name: string;
  state: PositionRowState;
  linkHref?: string;
  linkTitle?: string;
}) {
  const t = useTranslations("Score");
  const format = SFL_RULES.position[position].format;
  const isNext = state.kind === "next";
  const stat = rowStatLabel(state, t);
  const statClass = rowStatTone(state) === "accent" ? "text-accent" : "text-muted";

  const nameNode = linkHref ? (
    <Link
      href={linkHref}
      title={linkTitle}
      className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
    >
      {name}
    </Link>
  ) : (
    name
  );

  return (
    <div
      className={`flex items-center justify-between border bg-bg-2 px-3 py-2 ${
        isNext ? "border-accent" : "border-line"
      }`}
    >
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t(`positions.${position}`)} · {format}
          {isNext ? ` · ${t("nextLabel")}` : ""}
        </div>
        <div className="mt-0.5 font-display text-sm font-semibold">{nameNode}</div>
      </div>
      <div className={`font-mono text-xs font-bold ${statClass}`}>{stat}</div>
    </div>
  );
}
