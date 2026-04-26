"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FormatMode, Position } from "@/config/sfl-rules";

export type Side = "home" | "away";

export type Player = {
  name: string;
  position: Position;
  character?: string;
};

export type Team = {
  name: string;
  side: Side;
  players: Player[];
};

export type MatchRecord = {
  roundNo: number;
  position: Position | "tiebreak";
  winnerSide?: Side;
  points: number;
};

export type ScrimState = {
  id: string;
  format: FormatMode;
  teams: { home: Team; away: Team };
  matches: MatchRecord[];
  status: "in_progress" | "finished";
  createdAt: string;
};

type ScrimStore = {
  scrims: Record<string, ScrimState>;
  initScrim: (id: string, format: FormatMode) => void;
  setFormat: (id: string, format: FormatMode) => void;
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
  status: "in_progress",
  createdAt: new Date().toISOString(),
});

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
        const current = get().scrims[id];
        if (!current) return;
        set((state) => ({
          scrims: { ...state.scrims, [id]: { ...current, format } },
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
