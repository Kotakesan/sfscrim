"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROLES, roleStorageKey } from "@/lib/order-state";
import type { Side } from "@/store/scrim";

export function RoleEntry({
  scrimId,
  awayLocked,
}: {
  scrimId: string;
  awayLocked: boolean;
}) {
  const t = useTranslations("Order");

  const onPick = (role: Side) => {
    sessionStorage.setItem(roleStorageKey(scrimId), role);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ROLES.map((role) => (
        <RoleCard
          key={role}
          scrimId={scrimId}
          role={role}
          locked={role === "home" && !awayLocked}
          onPick={() => onPick(role)}
          t={t}
        />
      ))}
    </div>
  );
}

function RoleCard({
  scrimId,
  role,
  locked,
  onPick,
  t,
}: {
  scrimId: string;
  role: Side;
  locked: boolean;
  onPick: () => void;
  t: ReturnType<typeof useTranslations<"Order">>;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const onCopyUrl = async () => {
    const url = `${window.location.origin}${window.location.pathname}/order/${role}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-2 border-line bg-bg-2 p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        {t(`sides.${role}`)}
      </div>
      <h3 className="mt-1 font-display text-2xl font-bold tracking-[-0.01em]">
        {t(`roleEntryTitle.${role}`)}
      </h3>
      <p className="mt-2 font-mono text-xs leading-relaxed text-muted">
        {t(`roleEntryDesc.${role}`)}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/scrim/${scrimId}/order/${role}`}
          onClick={onPick}
          aria-disabled={locked}
          className={`inline-flex h-11 items-center border-2 border-accent bg-accent px-5 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink ${
            locked ? "pointer-events-none opacity-40" : ""
          }`}
        >
          {t(`roleEntryCta.${role}`)} →
        </Link>
        <button
          type="button"
          onClick={onCopyUrl}
          className="inline-flex h-11 items-center border-2 border-line bg-transparent px-4 font-mono text-xs uppercase tracking-[0.16em] text-muted transition-colors hover:border-ink hover:text-ink"
        >
          {copied ? t("copyUrlCopied") : t("copyUrl")}
        </button>
      </div>
      {locked && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
          ● {t("waitingForAway")}
        </p>
      )}
    </div>
  );
}
