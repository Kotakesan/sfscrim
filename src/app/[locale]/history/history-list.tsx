"use client";

import { useState } from "react";
import { useTranslations, useFormatter, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useScrimStore, type ScrimState } from "@/store/scrim";
import { useScrimStoreHydrated } from "@/lib/use-hydrated-scrim";

export function HistoryList() {
  const hydrated = useScrimStoreHydrated();
  const scrims = useScrimStore((s) => s.scrims);
  const reset = useScrimStore((s) => s.reset);
  const t = useTranslations("History");
  const tCommon = useTranslations("Common");
  const [announcement, setAnnouncement] = useState("");

  if (!hydrated) {
    return (
      <p className="py-12 text-center font-mono text-sm uppercase tracking-[0.18em] text-muted">
        {tCommon("loading")}
      </p>
    );
  }

  const list = Object.values(scrims).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  if (list.length === 0) {
    return (
      <div className="border-2 border-dashed border-line px-6 py-16 text-center">
        <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.01em]">
          {t("empty.title")}
        </h2>
        <p className="mt-3 text-base leading-[1.7] text-ink-2">
          {t("empty.body")}
        </p>
        <Link
          href="/scrim/new"
          className="mt-6 inline-flex h-[50px] items-center gap-2.5 border-2 border-accent bg-accent px-6 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t("empty.cta")}
        </Link>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    if (window.confirm(t("deleteConfirm"))) {
      reset(id);
      setAnnouncement(t("deleteAnnouncement", { id: id.slice(0, 6) }));
    }
  };

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((scrim) => (
          <li key={scrim.id}>
            <ScrimCard scrim={scrim} onDelete={handleDelete} />
          </li>
        ))}
      </ul>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}

function ScrimCard({
  scrim,
  onDelete,
}: {
  scrim: ScrimState;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("History.card");
  const tScrim = useTranslations("Scrim");
  const format = useFormatter();
  const locale = useLocale();

  const shortId = scrim.id.slice(0, 6);
  const homeName = scrim.teams.home.name?.trim() || t("teamUnnamed");
  const awayName = scrim.teams.away.name?.trim() || t("teamUnnamed");
  const formattedDate = format.dateTime(new Date(scrim.createdAt), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="flex h-full flex-col border-2 border-line p-5 transition-colors hover:border-ink">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {t("scrimIdLabel")} · {shortId}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            {tScrim(`statuses.${scrim.status}`)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDelete(scrim.id)}
          aria-label={`${t("deleteLabel")}: ${shortId}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-accent hover:underline focus-visible:text-accent focus-visible:underline focus-visible:outline-none"
        >
          {t("deleteLabel")}
        </button>
      </header>

      <h2
        lang={locale}
        className="mt-4 font-display text-xl font-bold leading-[1.3] tracking-[-0.01em]"
      >
        {homeName}
        <span className="mx-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          {t("vs")}
        </span>
        {awayName}
      </h2>

      <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
        <div>
          <dt className="text-ink-2">{t("formatLabel")}</dt>
          <dd className="mt-0.5 text-ink">
            {tScrim(`formats.${scrim.format}`)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-2">{t("matchesLabel")}</dt>
          <dd className="mt-0.5 text-ink">
            {t("matchesUnit", { n: scrim.matches.length })}
          </dd>
        </div>
        <div>
          <dt className="text-ink-2">{t("createdLabel")}</dt>
          <dd className="mt-0.5 text-ink">{formattedDate}</dd>
        </div>
      </dl>

      <div className="mt-5 flex justify-end">
        <Link
          href={`/scrim/${scrim.id}`}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {t("openLabel")}
        </Link>
      </div>
    </article>
  );
}
