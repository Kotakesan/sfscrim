// SF6 + SFV ゲスト + SF6 Year 2 (Mai/Elena/...) のキャラクター定義。
// rireki.gg (packages/shared/src/characters.ts) と同じ ID / toolName 体系を採用し、
// 将来データ連携が発生しても齟齬が出ないようにする。

export type Character = {
  id: number;
  name: string;
  nameJa: string;
  toolName: string;
};

export const CHARACTERS = [
  { id: 1, name: "Ryu", nameJa: "リュウ", toolName: "ryu" },
  { id: 2, name: "Luke", nameJa: "ルーク", toolName: "luke" },
  { id: 3, name: "Kimberly", nameJa: "キンバリー", toolName: "kimberly" },
  { id: 4, name: "Chun-Li", nameJa: "春麗", toolName: "chunli" },
  { id: 5, name: "Manon", nameJa: "マノン", toolName: "manon" },
  { id: 6, name: "Zangief", nameJa: "ザンギエフ", toolName: "zangief" },
  { id: 7, name: "JP", nameJa: "JP", toolName: "jp" },
  { id: 8, name: "Dhalsim", nameJa: "ダルシム", toolName: "dhalsim" },
  { id: 9, name: "Cammy", nameJa: "キャミィ", toolName: "cammy" },
  { id: 10, name: "Ken", nameJa: "ケン", toolName: "ken" },
  { id: 11, name: "Dee Jay", nameJa: "ディージェイ", toolName: "deejay" },
  { id: 12, name: "Lily", nameJa: "リリー", toolName: "lily" },
  { id: 13, name: "A.K.I.", nameJa: "A.K.I.", toolName: "aki" },
  { id: 14, name: "Rashid", nameJa: "ラシード", toolName: "rashid" },
  { id: 15, name: "Blanka", nameJa: "ブランカ", toolName: "blanka" },
  { id: 16, name: "Juri", nameJa: "ジュリ", toolName: "juri" },
  { id: 17, name: "Marisa", nameJa: "マリーザ", toolName: "marisa" },
  { id: 18, name: "Guile", nameJa: "ガイル", toolName: "guile" },
  { id: 19, name: "Ed", nameJa: "エド", toolName: "ed" },
  { id: 20, name: "E.Honda", nameJa: "E.本田", toolName: "honda" },
  { id: 21, name: "Jamie", nameJa: "ジェイミー", toolName: "jamie" },
  { id: 22, name: "Akuma", nameJa: "豪鬼", toolName: "akuma" },
  { id: 25, name: "Sagat", nameJa: "サガット", toolName: "sagat" },
  { id: 26, name: "M.Bison", nameJa: "ベガ", toolName: "mbison" },
  { id: 27, name: "Terry", nameJa: "テリー", toolName: "terry" },
  { id: 28, name: "Mai", nameJa: "舞", toolName: "mai" },
  { id: 29, name: "Elena", nameJa: "エレナ", toolName: "elena" },
  { id: 30, name: "C.Viper", nameJa: "C.ヴァイパー", toolName: "cviper" },
  { id: 31, name: "Alex", nameJa: "アレックス", toolName: "alex" },
  { id: 254, name: "Random", nameJa: "ランダム", toolName: "random" },
] as const satisfies readonly Character[];

export type ControlType = "classic" | "modern";
export const CONTROL_TYPES: ReadonlyArray<ControlType> = ["classic", "modern"];

export function getCharacterName(id: number, locale = "ja"): string {
  const c = CHARACTERS.find((c) => c.id === id);
  if (!c) return "Unknown";
  return locale === "ja" ? c.nameJa : c.name;
}
