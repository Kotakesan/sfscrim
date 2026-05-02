"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession, signOut } from "@/lib/auth/client";

export function HeaderAuth() {
  const t = useTranslations("Auth.header");
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPending) {
    return <div className="h-8 w-8" aria-hidden="true" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none"
      >
        {t("signIn")}
      </Link>
    );
  }

  const user = session.user;
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menuLabel", { name: user.name ?? user.email })}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-line bg-bg font-display text-sm font-bold text-ink transition-colors hover:border-ink focus-visible:border-ink focus-visible:outline-none"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 min-w-[200px] border-2 border-ink bg-bg p-3 shadow-[4px_4px_0_0_var(--color-ink)]">
          <div className="px-2 py-1 font-display text-sm font-semibold text-ink">
            {user.name ?? user.email}
          </div>
          {user.name && (
            <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {user.email}
            </div>
          )}
          <hr className="my-2 border-line" />
          <div role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="block w-full px-2 py-1.5 text-left font-mono text-xs uppercase tracking-[0.18em] text-ink hover:bg-ink hover:text-bg focus-visible:bg-ink focus-visible:text-bg focus-visible:outline-none"
            >
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
