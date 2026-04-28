"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CHARACTERS,
  CONTROL_TYPES,
  getCharacterName,
  type ControlType,
} from "@/config/characters";
import { BATTLE_POSITIONS, type PlayerSlot } from "@/config/sfl-rules";
import { useScrimStore, type Player, type Side } from "@/store/scrim";
import { isPositionCommittedAt } from "@/lib/order-state";

const POSITIONS: ReadonlyArray<PlayerSlot> = [
  "vanguard",
  "midfield",
  "champion",
  "sub",
];

// ホーム逐次フローで「次に編集可能になるポジ」の前提条件（直前ポジが committed か）
const PREVIOUS_POSITION: Partial<Record<PlayerSlot, PlayerSlot>> = {
  midfield: "vanguard",
  champion: "midfield",
  sub: "champion",
};

export type OrderFormMode = "bulk" | "sequential";

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
  /** "bulk" = 全ポジ一括保存（アウェイ用）、"sequential" = 1 ポジずつ発表（ホーム用） */
  mode?: OrderFormMode;
};

export function OrderForm({
  scrimId,
  side,
  teamName,
  players,
  locked = false,
  mode = "bulk",
}: OrderFormProps) {
  const t = useTranslations("Order");
  const locale = useLocale();
  const setTeamName = useScrimStore((s) => s.setTeamName);
  const setTeamPlayers = useScrimStore((s) => s.setTeamPlayers);
  const commitAllPositions = useScrimStore((s) => s.commitAllPositions);

  const [draft, setDraft] = useState<DraftPlayer[]>(() =>
    buildEmptyDraft(players),
  );

  const updateDraft = (idx: number, patch: Partial<DraftPlayer>) => {
    setDraft((curr) => curr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const errors = mode === "bulk" ? validateDraft(draft, t) : [];
  const dirty =
    JSON.stringify(toCommitted(draft)) !==
    JSON.stringify(stripCommittedFlag(players));

  const onSave = () => {
    if (errors.length > 0 || locked) return;
    setTeamPlayers(scrimId, side, toCommitted(draft));
    commitAllPositions(scrimId, side);
  };

  const sideLabel = t(`sides.${side}`);
  const isSequential = mode === "sequential";

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
            ● {t("waitingForAway")}
          </span>
        )}
      </header>

      {isSequential && !locked && (
        <p className="mb-4 border border-accent bg-accent-soft px-4 py-3 font-mono text-xs leading-relaxed text-ink-2">
          {t("sequentialIntro")}
        </p>
      )}

      <div className="grid gap-3">
        {draft.map((p, idx) => (
          <PlayerRow
            key={p.position}
            draft={p}
            locale={locale}
            onChange={(patch) => updateDraft(idx, patch)}
            t={t}
            disabled={locked || isPositionDisabled(p, players, isSequential)}
            sequential={isSequential}
            committed={isPositionCommittedAt(players, p.position)}
            announcable={
              isSequential &&
              !locked &&
              canAnnouncePosition(p, players) &&
              !isPositionCommittedAt(players, p.position) &&
              p.name.trim().length > 0
            }
            onAnnounce={() => {
              const next = mergePlayer(players, p);
              setTeamPlayers(scrimId, side, next);
            }}
          />
        ))}
      </div>

      {!locked && !isSequential && errors.length > 0 && (
        <ul className="mt-4 border border-accent bg-accent-soft px-4 py-3 font-mono text-xs leading-relaxed text-accent">
          {errors.map((err) => (
            <li key={err}>· {err}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!isSequential && (
          <button
            type="button"
            onClick={onSave}
            disabled={locked || errors.length > 0 || !dirty}
            className="inline-flex h-11 items-center border-2 border-accent bg-accent px-5 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-accent disabled:hover:bg-accent"
          >
            {t("saveTeamOrder")}
          </button>
        )}
        <PreviewLink
          scrimId={scrimId}
          enabled={isSequential || (!dirty && errors.length === 0)}
          t={t}
        />
        {!isSequential &&
          !dirty &&
          players.length === POSITIONS.length &&
          errors.length === 0 && (
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
              {t("savedLabel")}
            </span>
          )}
      </div>
    </section>
  );
}

type PreviewLinkProps = {
  scrimId: string;
  enabled: boolean;
  t: ReturnType<typeof useTranslations<"Order">>;
};

function PreviewLink({ scrimId, enabled, t }: PreviewLinkProps) {
  const baseClass =
    "inline-flex h-11 items-center border-2 border-ink bg-transparent px-5 font-display text-sm font-semibold text-ink transition-colors";
  if (enabled) {
    return (
      <Link
        href={`/scrim/${scrimId}#preview`}
        className={`${baseClass} hover:bg-ink hover:text-bg`}
      >
        {t("viewPreview")} →
      </Link>
    );
  }
  return (
    <span
      role="link"
      aria-disabled="true"
      title={t("previewSaveHint")}
      className={`${baseClass} cursor-not-allowed opacity-40`}
    >
      {t("viewPreview")} →
    </span>
  );
}

function isPositionDisabled(
  draft: DraftPlayer,
  players: Player[],
  sequential: boolean,
): boolean {
  if (!sequential) return false;
  if (isPositionCommittedAt(players, draft.position)) return true;
  return !canAnnouncePosition(draft, players);
}

function canAnnouncePosition(
  draft: DraftPlayer,
  players: Player[],
): boolean {
  const previous = PREVIOUS_POSITION[draft.position];
  if (!previous) return true; // 先鋒は最初から編集可
  return isPositionCommittedAt(players, previous);
}

type PlayerRowProps = {
  draft: DraftPlayer;
  locale: string;
  onChange: (patch: Partial<DraftPlayer>) => void;
  t: ReturnType<typeof useTranslations<"Order">>;
  disabled?: boolean;
  sequential?: boolean;
  committed?: boolean;
  announcable?: boolean;
  onAnnounce?: () => void;
};

function PlayerRow({
  draft,
  locale,
  onChange,
  t,
  disabled = false,
  sequential = false,
  committed = false,
  announcable = false,
  onAnnounce,
}: PlayerRowProps) {
  const inputClass =
    "min-w-0 border border-line bg-bg px-3 py-2 font-display text-sm focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:bg-bg-3";

  return (
    <div className="border border-line bg-bg p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[110px_1fr_1fr_140px]">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted md:justify-start">
          <span>{t(`positions.${draft.position}`)}</span>
          {sequential && committed && (
            <span className="ml-2 text-accent">{t("announcedLabel")}</span>
          )}
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
      {sequential && !committed && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onAnnounce}
            disabled={!announcable}
            className="inline-flex h-9 items-center border-2 border-accent bg-accent px-4 font-display text-xs font-semibold text-bg transition-colors hover:border-ink hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-accent disabled:hover:bg-accent"
          >
            {t("announceCta", { position: t(`positions.${draft.position}`) })}
          </button>
          {disabled && !committed && (
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              {t("waitingForPrevious")}
            </span>
          )}
        </div>
      )}
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

function stripCommittedFlag(players: Player[]): Player[] {
  return players.map((p) => ({
    name: p.name,
    position: p.position,
    characterId: p.characterId,
    controlType: p.controlType,
  }));
}

function mergePlayer(existing: Player[], draft: DraftPlayer): Player[] {
  const others = existing.filter((p) => p.position !== draft.position);
  return [
    ...others,
    {
      name: draft.name.trim(),
      position: draft.position,
      characterId: draft.characterId,
      controlType: draft.controlType,
      committed: true,
    },
  ];
}

function validateDraft(
  draft: DraftPlayer[],
  t: ReturnType<typeof useTranslations<"Order">>,
): string[] {
  const errors: string[] = [];
  const named = draft.filter((p) => p.name.trim().length > 0);

  // メイン 3 名（先鋒・中堅・大将）は必須
  for (const pos of BATTLE_POSITIONS) {
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
