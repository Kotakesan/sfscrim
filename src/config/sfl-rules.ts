// SFL ルール定数。docs/sfl-rules.md の「ハードコード禁止項目」に対応。
// シーズン更新時はこのファイルだけを書き換えて済むよう、
// アプリ全域でこの定数を参照する。

export const SFL_RULES = {
  position: {
    vanguard: { points: 10, format: "Bo3" },
    midfield: { points: 10, format: "Bo3" },
    champion: { points: 20, format: "Bo5" },
    tiebreak: { points: 10, format: "Bo3" },
  },
  format: {
    regular: { maxPoints: 40, hasTiebreak: true },
    playoff: { winPoints: 70, maxRounds: 4 },
    final: { winPoints: 90, maxRounds: 4 },
  },
} as const;

// 通常バトルの 3 ポジション（先鋒・中堅・大将）
export type BattlePosition = "vanguard" | "midfield" | "champion";

// 選手登録用：通常 3 ポジション + 控え
export type PlayerSlot = BattlePosition | "sub";

// 試合記録用：通常 3 ポジション + 延長戦
export type MatchPosition = BattlePosition | "tiebreak";

export type FormatMode = keyof typeof SFL_RULES.format;
