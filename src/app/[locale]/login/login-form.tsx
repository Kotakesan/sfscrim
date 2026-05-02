"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function LoginForm() {
  const t = useTranslations("Auth.login");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/dev/test-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
        });
        if (!res.ok) {
          setError(t("errorGeneric"));
          return;
        }
        router.replace("/");
        router.refresh();
      } catch {
        setError(t("errorGeneric"));
      }
    });
  };

  return (
    <div className="border-2 border-line p-6">
      <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.01em]">
        {t("mockHeading")}
      </h2>
      <p className="mt-3 text-base leading-[1.7] text-ink-2">{t("mockBody")}</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="mt-6 inline-flex h-[50px] items-center gap-2.5 border-2 border-accent bg-accent px-6 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("loading") : t("mockButton")}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-accent"
        >
          {error}
        </p>
      )}
    </div>
  );
}
