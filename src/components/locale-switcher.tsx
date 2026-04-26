"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className={`flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] ${className}`}
    >
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => router.replace(pathname, { locale: loc })}
            aria-pressed={active}
            className={`h-7 border-2 px-2 transition-colors ${
              active
                ? "border-ink bg-ink text-bg"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {loc.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
