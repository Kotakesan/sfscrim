import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

export async function SiteHeader() {
  const t = await getTranslations("Legal");

  return (
    <header
      className="sticky top-0 z-30 border-b border-line backdrop-blur"
      style={{ background: "var(--bg-translucent)" }}
    >
      <div className="mx-auto max-w-[1320px] px-8">
        <div className="flex h-[60px] items-center justify-between">
          <Link
            href="/"
            aria-label={t("backToHome")}
            className="font-display text-2xl font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span aria-hidden="true">
              SF<i className="not-italic text-accent">S</i>crim
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none sm:inline"
            >
              {t("backToHome")}
            </Link>
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
