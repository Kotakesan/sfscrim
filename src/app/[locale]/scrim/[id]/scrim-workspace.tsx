"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useScrimStore, type ScrimState } from "@/store/scrim";
import type { FormatMode } from "@/config/sfl-rules";

const FORMAT_OPTIONS: ReadonlyArray<FormatMode> = [
  "regular",
  "playoff",
  "final",
];

export function ScrimWorkspace({ id }: { id: string }) {
  const t = useTranslations("Scrim");
  const [hydrated, setHydrated] = useState(false);
  const scrim = useScrimStore((s) => s.scrims[id]);
  const initScrim = useScrimStore((s) => s.initScrim);
  const setFormat = useScrimStore((s) => s.setFormat);
  const reset = useScrimStore((s) => s.reset);

  // Zustand persist の hydration が確定するのを待ってから init/render する。
  // これをやらないと localStorage 読み込み前に initScrim が走って既存データを上書きする恐れがある。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(useScrimStore.persist.hasHydrated());
    return useScrimStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !scrim) {
      initScrim(id, "regular");
    }
  }, [hydrated, scrim, id, initScrim]);

  if (!hydrated || !scrim) {
    return <ScrimSkeleton />;
  }

  return (
    <main className="mx-auto max-w-[1320px] flex-1 px-8 py-12">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {t("scrimLabel")}
      </div>
      <h1 className="mt-2 font-display text-5xl font-extrabold tracking-[-0.02em]">
        #<span className="text-accent">{scrim.id}</span>
      </h1>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <section>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {t("formatLabel")}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFormat(id, opt)}
                className={`h-11 px-5 font-display text-sm font-semibold border-2 transition-colors ${
                  scrim.format === opt
                    ? "bg-ink text-bg border-ink"
                    : "bg-transparent text-ink border-line hover:border-ink"
                }`}
              >
                {t(`formats.${opt}`)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {t("metaLabel")}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm">
            <dt className="text-muted">{t("statusLabel")}</dt>
            <dd>{t(`statuses.${scrim.status}`)}</dd>
            <dt className="text-muted">{t("createdAtLabel")}</dt>
            <dd>{new Date(scrim.createdAt).toLocaleString()}</dd>
          </dl>
        </section>
      </div>

      <ScrimEmptyHint scrim={scrim} />

      <div className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6">
        <Link
          href="/"
          className="inline-flex h-11 items-center border-2 border-ink bg-transparent px-5 font-display text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-bg"
        >
          {t("backToHome")}
        </Link>
        <button
          type="button"
          onClick={() => reset(id)}
          className="inline-flex h-11 items-center border-2 border-line bg-transparent px-5 font-display text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {t("resetScrim")}
        </button>
      </div>
    </main>
  );
}

function ScrimEmptyHint({ scrim }: { scrim: ScrimState }) {
  const t = useTranslations("Scrim");
  if (scrim.matches.length > 0 || scrim.teams.home.players.length > 0) {
    return null;
  }
  return (
    <div className="mt-10 border border-line bg-bg-2 px-6 py-5 font-mono text-xs leading-relaxed text-ink-2">
      {t("emptyHint")}
    </div>
  );
}

function ScrimSkeleton() {
  return (
    <main className="mx-auto max-w-[1320px] flex-1 px-8 py-12">
      <div className="h-3 w-32 bg-line" />
      <div className="mt-3 h-12 w-64 bg-line" />
      <div className="mt-10 h-32 bg-bg-2" />
    </main>
  );
}
