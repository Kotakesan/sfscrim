// SFL ルール定数。docs/sfl-rules.md の「ハードコード禁止項目」に対応。
// シーズン更新時はこのファイルだけを書き換えて済むよう、
// アプリ全域でこの定数を参照する。

export const SFL_RULES = {
  position: {
    first: { points: 10, format: "Bo3" },
    second: { points: 10, format: "Bo3" },
    third: { points: 20, format: "Bo5" },
    tiebreak: { points: 10, format: "Bo3" },
  },
  format: {
    regular: { maxPoints: 40, hasTiebreak: true },
    playoff: { winPoints: 70, maxRounds: 4, hasTiebreak: false },
    final: { winPoints: 90, maxRounds: 4, hasTiebreak: false },
  },
} as const;

// 通常バトルの 3 ポジション（先鋒・中堅・大将 / 1st・2nd・3rd）
export type BattlePosition = "first" | "second" | "third";

export const BATTLE_POSITIONS = [
  "first",
  "second",
  "third",
] as const satisfies readonly BattlePosition[];

// 選手登録用：通常 3 ポジション + 控え
export type PlayerSlot = BattlePosition | "sub";

// 試合記録用：通常 3 ポジション + 延長戦
export type MatchPosition = BattlePosition | "tiebreak";

export type FormatMode = keyof typeof SFL_RULES.format;
