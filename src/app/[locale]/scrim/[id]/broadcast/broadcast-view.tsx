"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useHydratedScrim } from "@/lib/use-hydrated-scrim";
import { LiveDashboard } from "../live-dashboard";

export function BroadcastView({ id }: { id: string }) {
  const tBroadcast = useTranslations("Broadcast");
  const tScrim = useTranslations("Scrim");
  const { hydrated, scrim } = useHydratedScrim(id);

  if (!hydrated) {
    return <BroadcastSkeleton />;
  }

  if (!scrim) {
    return (
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col items-center justify-center px-6 py-12 md:px-10">
        <p className="font-mono text-sm text-muted">{tBroadcast("notFound")}</p>
        <Link
          href="/"
          className="mt-4 inline-flex h-11 items-center border-2 border-ink bg-transparent px-5 font-display text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-bg"
        >
          {tScrim("backToHome")} →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6 md:px-10 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        <div>
          <span className="text-accent">●</span> {tBroadcast("badge")} ·{" "}
          {tScrim("scrimLabel")} #
          <span className="text-ink-2">{scrim.id}</span>
        </div>
        <Link
          href={`/scrim/${id}`}
          className="hover:text-ink"
        >
          ← {tBroadcast("backToDashboard")}
        </Link>
      </header>

      <LiveDashboard scrim={scrim} interactive={false} />

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {tBroadcast("hint")}
      </p>
    </main>
  );
}

function BroadcastSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6 md:px-10 md:py-10">
      <div className="h-3 w-48 bg-line" />
      <div className="mt-6 h-72 bg-bg-2" />
    </main>
  );
}
