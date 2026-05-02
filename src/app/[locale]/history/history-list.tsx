"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useScrimStore, type ScrimState } from "@/store/scrim";
import { useScrimStoreHydrated } from "@/lib/use-hydrated-scrim";
import type { StoredScrimSummary } from "@/lib/db/scrims";
import { toUnixSec } from "@/lib/scrim/snapshot";

type HistoryEntry =
  | {
      source: "d1";
      id: string;
      format: ScrimState["format"];
      teamHomeName: string | null;
      teamAwayName: string | null;
      matchCount: number;
      finalizedAt: number;
      status: "finished";
    }
  | {
      source: "local";
      id: string;
      format: ScrimState["format"];
      teamHomeName: string;
      teamAwayName: string;
      matchCount: number;
      finalizedAt: number;
      status: ScrimState["status"];
    };

interface HistoryListProps {
  signedIn: boolean;
  storedScrims: StoredScrimSummary[];
}

export function HistoryList({ signedIn, storedScrims }: HistoryListProps) {
  const hydrated = useScrimStoreHydrated();
  const localScrims = useScrimStore((s) => s.scrims);
  const reset = useScrimStore((s) => s.reset);
  const t = useTranslations("History");
  const tCommon = useTranslations("Common");
  const [announcement, setAnnouncement] = useState("");
  const [d1Deleted, setD1Deleted] = useState<Set<string>>(new Set());
  const [deletePending, setDeletePending] = useState<Set<string>>(new Set());

  const merged = useMemo<HistoryEntry[]>(() => {
    if (!hydrated) return [];
    // 同 ID 衝突時は D1 優先（issue #82 仕様）
    const localList: HistoryEntry[] = Object.values(localScrims).map((s) => ({
      source: "local",
      id: s.id,
      format: s.format,
      teamHomeName: s.teams.home.name,
      teamAwayName: s.teams.away.name,
      matchCount: s.matches.length,
      finalizedAt: toUnixSec(s.createdAt),
      status: s.status,
    }));
    const d1List: HistoryEntry[] = storedScrims
      .filter((s) => !d1Deleted.has(s.id))
      .map((s) => ({
        source: "d1",
        id: s.id,
        format: s.format,
        teamHomeName: s.teamHomeName,
        teamAwayName: s.teamAwayName,
        matchCount: s.matchCount,
        finalizedAt: s.finalizedAt,
        status: "finished",
      }));
    const d1Ids = new Set(d1List.map((s) => s.id));
    const dedupedLocal = localList.filter((s) => !d1Ids.has(s.id));
    return [...d1List, ...dedupedLocal].sort((a, b) => b.finalizedAt - a.finalizedAt);
  }, [hydrated, localScrims, storedScrims, d1Deleted]);

  if (!hydrated) {
    return (
      <p className="py-12 text-center font-mono text-sm uppercase tracking-[0.18em] text-muted">
        {tCommon("loading")}
      </p>
    );
  }

  if (merged.length === 0) {
    return (
      <div className="border-2 border-dashed border-line px-6 py-16 text-center">
        <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.01em]">
          {t("empty.title")}
        </h2>
        <p className="mt-3 text-base leading-[1.7] text-ink-2">{t("empty.body")}</p>
        <Link
          href="/scrim/new"
          className="mt-6 inline-flex h-[50px] items-center gap-2.5 border-2 border-accent bg-accent px-6 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t("empty.cta")}
        </Link>
      </div>
    );
  }

  const handleDelete = async (entry: HistoryEntry) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    if (entry.source === "d1") {
      setDeletePending((prev) => new Set(prev).add(entry.id));
      try {
        const res = await fetch(`/api/scrim/${encodeURIComponent(entry.id)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setD1Deleted((prev) => new Set(prev).add(entry.id));
          setAnnouncement(t("deleteAnnouncement", { id: entry.id.slice(0, 6) }));
        } else {
          window.alert(t("deleteFailed"));
        }
      } finally {
        setDeletePending((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }
      return;
    }
    reset(entry.id);
    setAnnouncement(t("deleteAnnouncement", { id: entry.id.slice(0, 6) }));
  };

  return (
    <>
      {signedIn && (
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          {t("hybridNote")}
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {merged.map((entry) => (
          <li key={`${entry.source}:${entry.id}`}>
            <ScrimCard
              entry={entry}
              onDelete={handleDelete}
              pending={deletePending.has(entry.id)}
            />
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
  entry,
  onDelete,
  pending,
}: {
  entry: HistoryEntry;
  onDelete: (entry: HistoryEntry) => void;
  pending: boolean;
}) {
  const t = useTranslations("History.card");
  const tScrim = useTranslations("Scrim");
  const format = useFormatter();
  const locale = useLocale();

  const shortId = entry.id.slice(0, 6);
  const homeName = entry.teamHomeName?.trim() || t("teamUnnamed");
  const awayName = entry.teamAwayName?.trim() || t("teamUnnamed");
  const formattedDate = format.dateTime(new Date(entry.finalizedAt * 1000), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const sourceTag = entry.source === "d1" ? t("sourceCloud") : t("sourceLocal");

  return (
    <article className="flex h-full flex-col border-2 border-line p-5 transition-colors hover:border-ink">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {t("scrimIdLabel")} · {shortId} · {sourceTag}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            {tScrim(`statuses.${entry.status}`)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDelete(entry)}
          disabled={pending}
          aria-label={`${t("deleteLabel")}: ${shortId}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-accent hover:underline focus-visible:text-accent focus-visible:underline focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? t("deletePending") : t("deleteLabel")}
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
          <dd className="mt-0.5 text-ink">{tScrim(`formats.${entry.format}`)}</dd>
        </div>
        <div>
          <dt className="text-ink-2">{t("matchesLabel")}</dt>
          <dd className="mt-0.5 text-ink">
            {t("matchesUnit", { n: entry.matchCount })}
          </dd>
        </div>
        <div>
          <dt className="text-ink-2">{t("createdLabel")}</dt>
          <dd className="mt-0.5 text-ink">{formattedDate}</dd>
        </div>
      </dl>

      {entry.source === "local" ? (
        <div className="mt-5 flex justify-end">
          <Link
            href={`/scrim/${entry.id}`}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {t("openLabel")}
          </Link>
        </div>
      ) : (
        // D1 履歴は immutable snapshot のため再開不可。詳細閲覧 UI は Phase 2 で別途。
        <div className="mt-5 flex justify-end">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {t("snapshotOnly")}
          </span>
        </div>
      )}
    </article>
  );
}
