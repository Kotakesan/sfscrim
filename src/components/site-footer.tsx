import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const tFooter = await getTranslations("SiteFooter");
  const tLanding = await getTranslations("Landing");

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-[1320px] px-8 py-6">
        <nav
          aria-label={tFooter("navHeading")}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em]"
        >
          <span className="text-accent">— {tFooter("navHeading")}</span>
          <Link href="/" className="text-muted hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none">
            {tFooter("navHome")}
          </Link>
          <Link href="/history" className="text-muted hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none">
            {tFooter("navHistory")}
          </Link>
          <Link href="/privacy" className="text-muted hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none">
            {tFooter("navPrivacy")}
          </Link>
          <Link href="/terms" className="text-muted hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none">
            {tFooter("navTerms")}
          </Link>
          <Link href="/contact" className="text-muted hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline focus-visible:outline-none">
            {tFooter("navContact")}
          </Link>
        </nav>
        <div className="mt-4 flex flex-wrap justify-between gap-4 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <span>{tLanding("footerCopyright")}</span>
          <span>{tLanding("footerTagline")}</span>
          <span>{tLanding("footerDisclaimer")}</span>
        </div>
      </div>
    </footer>
  );
}
