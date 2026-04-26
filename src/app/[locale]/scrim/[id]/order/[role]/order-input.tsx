"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Side } from "@/store/scrim";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { isMainBattleCommitted, roleStorageKey } from "@/lib/order-state";
import { useHydratedScrim } from "@/lib/use-hydrated-scrim";
import { OrderForm } from "../../order-form";

export function OrderInput({ id, role }: { id: string; role: Side }) {
  const t = useTranslations("Order");
  const tScrim = useTranslations("Scrim");
  const router = useRouter();
  const { hydrated, scrim } = useHydratedScrim(id);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const key = roleStorageKey(id);
    const pinned = sessionStorage.getItem(key);
    if (pinned == null) {
      sessionStorage.setItem(key, role);
    } else if (pinned !== role) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWarning(true);
    }
  }, [hydrated, id, role]);

  const onProceed = () => {
    sessionStorage.setItem(roleStorageKey(id), role);
    setShowWarning(false);
  };

  const onCancel = () => {
    setShowWarning(false);
    router.push(`/scrim/${id}`);
  };

  if (!hydrated || !scrim) return <OrderInputSkeleton />;

  const homeLocked =
    role === "home" && !isMainBattleCommitted(scrim.teams.away.players);

  return (
    <main className="mx-auto max-w-[820px] flex-1 px-6 py-10 md:px-8 md:py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            <Link
              href={`/scrim/${id}`}
              className="hover:text-ink"
            >
              ← {t("backToDashboard")}
            </Link>
            <Link
              href={`/scrim/${id}#preview`}
              className="text-accent hover:text-ink"
            >
              {t("viewPreview")} →
            </Link>
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.02em]">
            {t(`roleEntryTitle.${role}`)}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {tScrim("scrimLabel")} #
            <span className="text-accent">{scrim.id}</span>
          </p>
        </div>
        <LocaleSwitcher className="mt-2" />
      </div>

      <p className="mt-6 max-w-2xl font-mono text-xs leading-relaxed text-muted">
        {t("flowExplanation")}
      </p>

      <div className="mt-8">
        <OrderForm
          scrimId={id}
          side={role}
          teamName={scrim.teams[role].name}
          players={scrim.teams[role].players}
          locked={homeLocked}
        />
      </div>

      {showWarning && (
        <RoleMismatchModal
          role={role}
          onProceed={onProceed}
          onCancel={onCancel}
        />
      )}
    </main>
  );
}

function RoleMismatchModal({
  role,
  onProceed,
  onCancel,
}: {
  role: Side;
  onProceed: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Order");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-mismatch-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md border-2 border-ink bg-bg p-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          ⚠ {t("roleMismatchTag")}
        </div>
        <h2
          id="role-mismatch-title"
          className="mt-2 font-display text-2xl font-bold tracking-[-0.01em]"
        >
          {t("roleMismatchTitle")}
        </h2>
        <p className="mt-3 font-mono text-xs leading-relaxed text-ink-2">
          {t("roleMismatchBody", { role: t(`sides.${role}`) })}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center border-2 border-ink bg-ink px-5 font-display text-sm font-semibold text-bg transition-colors hover:border-accent hover:bg-accent"
          >
            {t("roleMismatchCancel")}
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="inline-flex h-11 items-center border-2 border-line bg-transparent px-5 font-display text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {t("roleMismatchProceed")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderInputSkeleton() {
  return (
    <main className="mx-auto max-w-[820px] flex-1 px-6 py-10 md:px-8 md:py-12">
      <div className="h-3 w-32 bg-line" />
      <div className="mt-3 h-10 w-64 bg-line" />
      <div className="mt-8 h-64 bg-bg-2" />
    </main>
  );
}
