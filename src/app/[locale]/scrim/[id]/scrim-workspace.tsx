"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useScrimStore, type ScrimState } from "@/store/scrim";
import type { FormatMode } from "@/config/sfl-rules";
import { OrderForm } from "./order-form";
import { LineupPreview } from "./lineup-preview";

const FORMAT_OPTIONS: ReadonlyArray<FormatMode> = [
  "regular",
  "playoff",
  "final",
];

export function ScrimWorkspace({ id }: { id: string }) {
  const t = useTranslations("Scrim");
  const tOrder = useTranslations("Order");
  const [hydrated, setHydrated] = useState(false);
  const scrim = useScrimStore((s) => s.scrims[id]);
  const initScrim = useScrimStore((s) => s.initScrim);
  const setFormat = useScrimStore((s) => s.setFormat);
  const setStatus = useScrimStore((s) => s.setStatus);
  const reset = useScrimStore((s) => s.reset);

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

  const orderReady = isOrderComplete(scrim);
  const canStart = orderReady && scrim.status === "draft";

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
                disabled={scrim.status !== "draft"}
                className={`h-11 px-5 font-display text-sm font-semibold border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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

      <section className="mt-10">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
          {tOrder("sectionTagOrder")}
        </div>
        <h2 className="mb-2 font-display text-3xl font-bold tracking-[-0.01em]">
          {tOrder("sectionTitleOrder")}
        </h2>
        <p className="mb-6 max-w-2xl font-mono text-xs leading-relaxed text-muted">
          {tOrder("flowExplanation")}
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <OrderForm
            scrimId={id}
            side="away"
            teamName={scrim.teams.away.name}
            players={scrim.teams.away.players}
          />
          <OrderForm
            scrimId={id}
            side="home"
            teamName={scrim.teams.home.name}
            players={scrim.teams.home.players}
            locked={!isMainBattleCommitted(scrim.teams.away.players)}
          />
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
          {tOrder("sectionTagPreview")}
        </div>
        <h2 className="mb-6 font-display text-3xl font-bold tracking-[-0.01em]">
          {tOrder("sectionTitlePreview")}
        </h2>
        <LineupPreview home={scrim.teams.home} away={scrim.teams.away} />
      </section>

      <section className="mt-12 border-t-2 border-ink pt-6">
        {scrim.status === "in_progress" && (
          <div className="mb-4 border border-accent bg-accent-soft px-5 py-4 font-mono text-xs leading-relaxed text-ink-2">
            {tOrder("inProgressNotice")}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canStart}
            onClick={() => setStatus(id, "in_progress")}
            className="inline-flex h-12 items-center border-2 border-accent bg-accent px-6 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-accent disabled:hover:bg-accent"
          >
            {tOrder("startScrim")}
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center border-2 border-ink bg-transparent px-6 font-display text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-bg"
          >
            {t("backToHome")}
          </Link>
          <button
            type="button"
            onClick={() => reset(id)}
            className="inline-flex h-12 items-center border-2 border-line bg-transparent px-6 font-display text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {t("resetScrim")}
          </button>
        </div>
        {!orderReady && (
          <p className="mt-3 font-mono text-xs text-muted">
            {tOrder("startScrimHint")}
          </p>
        )}
      </section>
    </main>
  );
}

function isOrderComplete(scrim: ScrimState): boolean {
  return (["home", "away"] as const).every((side) =>
    isMainBattleCommitted(scrim.teams[side].players),
  );
}

function isMainBattleCommitted(players: ScrimState["teams"]["home"]["players"]): boolean {
  return (["vanguard", "midfield", "champion"] as const).every((pos) =>
    players.some((p) => p.position === pos && p.name.trim().length > 0),
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
