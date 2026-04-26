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
      setStatus: (id, status) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({ ...s, status })),
        }));
      },
      recordMatch: (id, match) => {
        set((state) => ({
          scrims: updateScrim(state.scrims, id, (s) => ({
            ...s,
            matches: [...s.matches, match],
          })),
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
    },
  ),
);
