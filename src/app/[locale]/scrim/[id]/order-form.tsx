"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  CHARACTERS,
  CONTROL_TYPES,
  getCharacterName,
  type ControlType,
} from "@/config/characters";
import type { PlayerSlot } from "@/config/sfl-rules";
import { useScrimStore, type Player, type Side } from "@/store/scrim";

const POSITIONS: ReadonlyArray<PlayerSlot> = [
  "vanguard",
  "midfield",
  "champion",
  "sub",
];

type DraftPlayer = {
  name: string;
  position: PlayerSlot;
  characterId?: number;
  controlType?: ControlType;
};

const buildEmptyDraft = (existing: Player[]): DraftPlayer[] => {
  const byPosition = new Map(existing.map((p) => [p.position, p]));
  return POSITIONS.map((pos) => {
    const p = byPosition.get(pos);
    return {
      name: p?.name ?? "",
      position: pos,
      characterId: p?.characterId,
      controlType: p?.controlType ?? "classic",
    };
  });
};

type OrderFormProps = {
  scrimId: string;
  side: Side;
  teamName: string;
  players: Player[];
  /** SFL ルール準拠の「Away 先出し → Home 応答」順序制約。home 側で Away saved 待ちの間 true */
  locked?: boolean;
};

export function OrderForm({
  scrimId,
  side,
  teamName,
  players,
  locked = false,
}: OrderFormProps) {
  const t = useTranslations("Order");
  const locale = useLocale();
  const setTeamName = useScrimStore((s) => s.setTeamName);
  const setTeamPlayers = useScrimStore((s) => s.setTeamPlayers);

  const [draft, setDraft] = useState<DraftPlayer[]>(() =>
    buildEmptyDraft(players),
  );

  const updateDraft = (idx: number, patch: Partial<DraftPlayer>) => {
    setDraft((curr) => curr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const errors = validateDraft(draft, t);
  const dirty = JSON.stringify(toCommitted(draft)) !== JSON.stringify(players);

  const onSave = () => {
    if (errors.length > 0 || locked) return;
    setTeamPlayers(scrimId, side, toCommitted(draft));
  };

  const sideLabel = t(`sides.${side}`);

  return (
    <section
      className={`border bg-bg-2 p-6 transition-opacity ${
        locked ? "border-line opacity-50" : "border-line"
      }`}
    >
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {sideLabel}
          </div>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(scrimId, side, e.target.value)}
            placeholder={t("teamNamePlaceholder")}
            disabled={locked}
            className="mt-1 w-full max-w-sm border-b-2 border-line bg-transparent pb-1 font-display text-2xl font-bold tracking-[-0.01em] focus:border-ink focus:outline-none disabled:cursor-not-allowed"
          />
        </div>
        {locked && (
          <span className="rounded-none border border-accent bg-bg px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            {t("waitingForAway")}
          </span>
        )}
      </header>

      <div className="grid gap-3">
        {draft.map((p, idx) => (
          <PlayerRow
            key={p.position}
            draft={p}
            locale={locale}
            onChange={(patch) => updateDraft(idx, patch)}
            t={t}
            disabled={locked}
          />
        ))}
      </div>

      {!locked && errors.length > 0 && (
        <ul className="mt-4 border border-accent bg-accent-soft px-4 py-3 font-mono text-xs leading-relaxed text-accent">
          {errors.map((err) => (
            <li key={err}>· {err}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={locked || errors.length > 0 || !dirty}
          className="inline-flex h-11 items-center border-2 border-accent bg-accent px-5 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-accent disabled:hover:bg-accent"
        >
          {t("saveTeamOrder")}
        </button>
        {!dirty && players.length === POSITIONS.length && errors.length === 0 && (
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
            {t("savedLabel")}
          </span>
        )}
      </div>
    </section>
  );
}

type PlayerRowProps = {
  draft: DraftPlayer;
  locale: string;
  onChange: (patch: Partial<DraftPlayer>) => void;
  t: ReturnType<typeof useTranslations<"Order">>;
  disabled?: boolean;
};

function PlayerRow({
  draft,
  locale,
  onChange,
  t,
  disabled = false,
}: PlayerRowProps) {
  const inputClass =
    "min-w-0 border border-line bg-bg px-3 py-2 font-display text-sm focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:bg-bg-3";

  return (
    <div className="grid grid-cols-1 gap-2 border border-line bg-bg p-3 md:grid-cols-[110px_1fr_1fr_140px]">
      <div className="flex items-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {t(`positions.${draft.position}`)}
      </div>
      <input
        type="text"
        value={draft.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={t("playerNamePlaceholder")}
        disabled={disabled}
        className={inputClass}
      />
      <select
        value={draft.characterId ?? ""}
        onChange={(e) =>
          onChange({
            characterId: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        disabled={disabled}
        className={inputClass}
      >
        <option value="">{t("characterPlaceholder")}</option>
        {CHARACTERS.map((c) => (
          <option key={c.id} value={c.id}>
            {getCharacterName(c.id, locale)}
          </option>
        ))}
      </select>
      <select
        value={draft.controlType ?? ""}
        onChange={(e) =>
          onChange({
            controlType: e.target.value
              ? (e.target.value as ControlType)
              : undefined,
          })
        }
        disabled={disabled}
        className={inputClass}
      >
        <option value="">{t("controlPlaceholder")}</option>
        {CONTROL_TYPES.map((ct) => (
          <option key={ct} value={ct}>
            {t(`controlTypes.${ct}`)}
          </option>
        ))}
      </select>
    </div>
  );
}

function toCommitted(draft: DraftPlayer[]): Player[] {
  return draft
    .filter((p) => p.name.trim().length > 0)
    .map((p) => ({
      name: p.name.trim(),
      position: p.position,
      characterId: p.characterId,
      controlType: p.controlType,
    }));
}

function validateDraft(
  draft: DraftPlayer[],
  t: ReturnType<typeof useTranslations<"Order">>,
): string[] {
  const errors: string[] = [];
  const named = draft.filter((p) => p.name.trim().length > 0);

  // メイン 3 名（先鋒・中堅・大将）は必須
  for (const pos of ["vanguard", "midfield", "champion"] as const) {
    const player = draft.find((p) => p.position === pos);
    if (!player || player.name.trim().length === 0) {
      errors.push(
        t("errors.requiredPosition", { position: t(`positions.${pos}`) }),
      );
    }
  }

  // 名前重複チェック
  const nameCounts = new Map<string, number>();
  for (const p of named) {
    const key = p.name.trim().toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  for (const [name, count] of nameCounts) {
    if (count > 1) errors.push(t("errors.duplicateName", { name }));
  }

  return errors;
}
