"use client";

import { useEffect, useState } from "react";
import { useScrimStore, type ScrimState } from "@/store/scrim";

export function useScrimStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(useScrimStore.persist.hasHydrated());
    return useScrimStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

export function useHydratedScrim(id: string): {
  hydrated: boolean;
  scrim: ScrimState | undefined;
} {
  const hydrated = useScrimStoreHydrated();
  const scrim = useScrimStore((s) => s.scrims[id]);
  const initScrim = useScrimStore((s) => s.initScrim);

  useEffect(() => {
    if (hydrated && !scrim) initScrim(id, "regular");
  }, [hydrated, scrim, id, initScrim]);

  return { hydrated, scrim };
}
