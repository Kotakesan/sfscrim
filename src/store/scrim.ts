"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  FormatMode,
  PlayerSlot,
  MatchPosition,
} from "@/config/sfl-rules";
import type { ControlType } from "@/config/characters";

export type Side = "home" | "away";

export type Player = {
  name: string;
  position: PlayerSlot;
  characterId?: number;
  controlType?: ControlType;
  // ホーム逐次申告フローで使用。未指定（旧 schema）は name の有無で判定する後方互換挙動
  committed?: boolean;
};

export type Team = {
  name: string;
  side: Side;
  players: Player[];
};

export type MatchRecord = {
  roundNo: number;
  position: MatchPosition;
  winnerSide?: Side;
  points: number;
};

export type ScrimStatus = "draft" | "in_progress" | "finished";

export type ScrimState = {
  id: string;
  format: FormatMode;
  teams: { home: Team; away: Team };
  matches: MatchRecord[];
  status: ScrimStatus;
  createdAt: string;
};

type ScrimStore = {
  scrims: Record<string, ScrimState>;
  initScrim: (id: string, format: FormatMode) => void;
  setFormat: (id: string, format: FormatMode) => void;
  setTeamName: (id: string, side: Side, name: string) => void;
  setTeamPlayers: (id: string, side: Side, players: Player[]) => void;
  commitPosition: (id: string, side: Side, position: PlayerSlot) => void;
  uncommitPosition: (id: string, side: Side, position: PlayerSlot) => void;
  commitAllPositions: (id: string, side: Side) => void;
  setStatus: (id: string, status: ScrimStatus) => void;
  recordMatch: (id: string, match: MatchRecord) => void;
  undoLastMatch: (id: string) => void;
  reset: (id: string) => void;
  hasScrim: (id: string) => boolean;
  getScrim: (id: string) => ScrimState | undefined;
};

const STORAGE_KEY = "sfscrim-storage";

const buildEmptyScrim = (id: string, format: FormatMode): ScrimState => ({
  id,
  format,
  teams: {
    home: { name: "Home", side: "home", players: [] },
    away: { name: "Away", side: "away", players: [] },
  },
  matches: [],
  status: "draft",
  createdAt: new Date().toISOString(),
});

const updateScrim = (
  scrims: Record<string, ScrimState>,
  id: string,
  patch: (s: ScrimState) => ScrimState,
): Record<string, ScrimState> => {
  const current = scrims[id];
  if (!current) return scrims;
  return { ...scrims, [id]: patch(current) };
};

// v0 → v1: ポジション識別子を SFL 公式英語表記由来に統一
// vanguard / midfield / champion → first / second / third（sub / tiebreak は変更なし）
const POSITION_RENAME_V0_TO_V1: Record<string, string> = {
  vanguard: "first",
  midfield: "second",
  champion: "third",
};

function renamePosition(value: string): string {
  return POSITION_RENAME_V0_TO_V1[value] ?? value;
}

type PersistedV0 = { scrims?: Record<string, ScrimState> };
type PersistedV1 = { scrims: Record<string, ScrimState> };

function migrateV0ToV1(state: unknown): PersistedV1 {
  const s = state as PersistedV0;
  if (!s?.scrims) return { scrims: {} };
  const scrims: Record<string, ScrimState> = {};
  for (const [id, scrim] of Object.entries(s.scrims)) {
    scrims[id] = {
      ...scrim,
      teams: {
        home: renameTeamPositions(scrim.teams.home),
        away: renameTeamPositions(scrim.teams.away),
      },
      matches: scrim.matches.map((m) => ({
        ...m,
        position: renamePosition(m.position) as MatchPosition,
      })),
    };
  }
  return { scrims };
}

function renameTeamPositions(team: ScrimState["teams"]["home"]): ScrimState["teams"]["home"] {
  return {
    ...team,
    players: team.players.map((p) => ({
      ...p,
      position: renamePosition(p.position) as PlayerSlot,
    })),
  };
}

export const useScrimStore = create<ScrimStore>()(
  persist(
    (set, get) => ({
      scrims: {},
      initScrim: (id, format) => {
        if (get().scrims[id]) return;
        set((state) => ({
          scrims: { ...state.scrims, [id]: buildEmptyScrim(id, format) },
        }));
      },
      setFormat: (id, format) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({ ...s, format })),
        }));
      },
      setTeamName: (id, side, name) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({
            ...s,
            teams: {
              ...s.teams,
              [side]: { ...s.teams[side], name },
            },
          })),
        }));
      },
      setTeamPlayers: (id, side, players) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({
            ...s,
            teams: {
              ...s.teams,
              [side]: { ...s.teams[side], players },
            },
          })),
        }));
      },
      commitPosition: (id, side, position) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({
            ...s,
            teams: {
              ...s.teams,
              [side]: {
                ...s.teams[side],
                players: s.teams[side].players.map((p) =>
                  p.position === position ? { ...p, committed: true } : p,
                ),
              },
            },
          })),
        }));
      },
      uncommitPosition: (id, side, position) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({
            ...s,
            teams: {
              ...s.teams,
              [side]: {
                ...s.teams[side],
                players: s.teams[side].players.map((p) =>
                  p.position === position ? { ...p, committed: false } : p,
                ),
              },
            },
          })),
        }));
      },
      commitAllPositions: (id, side) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({
            ...s,
            teams: {
              ...s.teams,
              [side]: {
                ...s.teams[side],
                players: s.teams[side].players.map((p) => ({
                  ...p,
                  committed: true,
                })),
              },
            },
          })),
        }));
      },
      setStatus: (id, status) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({ ...s, status })),
        }));
      },
      recordMatch: (id, match) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => {
            const dup = s.matches.some(
              (m) => m.roundNo === match.roundNo && m.position === match.position,
            );
            if (dup) return s;
            return { ...s, matches: [...s.matches, match] };
          }),
        }));
      },
      undoLastMatch: (id) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({
            ...s,
            matches: s.matches.slice(0, -1),
            // status を draft/in_progress に戻すかは workspace 側で判断
          })),
        }));
      },
      reset: (id) => {
        set((state) => {
          const next = { ...state.scrims };
          delete next[id];
          return { scrims: next };
        });
      },
      hasScrim: (id) => Boolean(get().scrims[id]),
      getScrim: (id) => get().scrims[id],
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState, fromVersion) => {
        if (fromVersion === 0) return migrateV0ToV1(persistedState);
        return persistedState as ScrimStore;
      },
    },
  ),
);
