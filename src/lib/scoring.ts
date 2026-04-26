import { SFL_RULES, type BattlePosition } from "@/config/sfl-rules";
import type { MatchRecord, ScrimState, Side } from "@/store/scrim";

export const REGULAR_BATTLE_ORDER: ReadonlyArray<BattlePosition> = [
  "vanguard",
  "midfield",
  "champion",
];

export type ScoreSummary = {
  home: number;
  away: number;
};

/** matches を集計して home/away の累計ポイントを返す */
export function tallyScore(matches: ReadonlyArray<MatchRecord>): ScoreSummary {
  const summary: ScoreSummary = { home: 0, away: 0 };
  for (const m of matches) {
    if (m.winnerSide) summary[m.winnerSide] += m.points;
  }
  return summary;
}

/** 指定ポジションの match を取得（同 round / position は 1 件のみ前提） */
export function findRegularMatch(
  matches: ReadonlyArray<MatchRecord>,
  position: BattlePosition,
): MatchRecord | undefined {
  return matches.find((m) => m.roundNo === 1 && m.position === position);
}

/** レギュラーシーズン 1 節での次に入力すべきポジションを返す。全完了で undefined */
export function nextRegularBattle(
  matches: ReadonlyArray<MatchRecord>,
): BattlePosition | undefined {
  return REGULAR_BATTLE_ORDER.find((pos) => !findRegularMatch(matches, pos));
}

export type RegularSeasonOutcome =
  | { kind: "in_progress" }
  | { kind: "tied"; score: ScoreSummary }
  | { kind: "decided"; winner: Side; score: ScoreSummary };

/** レギュラー 1 節の結果（決着 / 同点 / 進行中）を判定 */
export function regularSeasonOutcome(
  scrim: ScrimState,
): RegularSeasonOutcome {
  const allDone = REGULAR_BATTLE_ORDER.every((pos) =>
    findRegularMatch(scrim.matches, pos),
  );
  if (!allDone) return { kind: "in_progress" };

  const score = tallyScore(scrim.matches);
  if (score.home === score.away) return { kind: "tied", score };
  const winner: Side = score.home > score.away ? "home" : "away";
  return { kind: "decided", winner, score };
}

/** SFL_RULES からポジション別ポイントを取得 */
export function pointsFor(position: BattlePosition): number {
  return SFL_RULES.position[position].points;
}
