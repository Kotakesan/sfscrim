import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SFL_RULES } from "@/config/sfl-rules";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteFooter } from "@/components/site-footer";

const FEATURE_KEYS = ["order", "rules", "fourVsFour", "i18n"] as const;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  const stats = [
    {
      label: t("stats.vanguard"),
      value: `+${SFL_RULES.position.vanguard.points}`,
      accent: false,
    },
    {
      label: t("stats.midfield"),
      value: `+${SFL_RULES.position.midfield.points}`,
      accent: false,
    },
    {
      label: t("stats.champion"),
      value: `+${SFL_RULES.position.champion.points}`,
      accent: true,
    },
    {
      label: t("stats.regularMax"),
      value: `${SFL_RULES.format.regular.maxPoints}`,
      accent: false,
    },
    {
      label: t("stats.playoffWin"),
      value: `${SFL_RULES.format.playoff.winPoints}`,
      accent: false,
    },
    {
      label: t("stats.finalWin"),
      value: `${SFL_RULES.format.final.winPoints}`,
      accent: true,
    },
  ];

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-line backdrop-blur"
        style={{ background: "var(--bg-translucent)" }}
      >
        <div className="mx-auto max-w-[1320px] px-8">
          <div className="flex h-[60px] items-center justify-between">
            <div className="font-display text-2xl font-extrabold tracking-tight">
              SF<i className="not-italic text-accent">S</i>crim
            </div>
            <nav className="hidden gap-7 font-mono text-[11px] uppercase tracking-[0.18em] text-muted md:flex">
              <a href="#" className="hover:text-ink">
                {t("navScrim")}
              </a>
              <a href="#" className="hover:text-ink">
                {t("navRules")}
              </a>
              <a href="#" className="hover:text-ink">
                {t("navHelp")}
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <LocaleSwitcher />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                {t("navSignIn")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="pt-10 pb-[60px]">
        <div className="mx-auto max-w-[1320px] px-8">
          <div className="mb-8 flex flex-wrap items-center gap-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            <span className="bg-accent px-2.5 py-1 font-bold tracking-[0.16em] text-bg">
              {t("heroPill")}
            </span>
            <span className="before:text-accent before:content-['●_']">
              {t("heroLive")}
            </span>
            <span>{t("heroVersion")}</span>
          </div>

          <h1 className="m-0 font-display text-[clamp(56px,9vw,144px)] font-light leading-[0.92] tracking-[-0.04em]">
            <b className="font-extrabold">{t("heroTitleBold")}</b>
            <br />
            {t("heroTitleNormal")}{" "}
            <i className="not-italic text-accent">{t("heroTitleAccent")}</i>
          </h1>

          <div className="mt-7 grid items-end gap-14 md:grid-cols-[1.4fr_1fr]">
            <p className="m-0 max-w-[540px] text-lg leading-[1.7] text-ink">
              {t("heroLead")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/scrim/new"
                className="inline-flex h-[50px] items-center gap-2.5 border-2 border-accent bg-accent px-6 font-display text-sm font-semibold text-bg transition-colors hover:border-ink hover:bg-ink"
              >
                {t("ctaCreate")}
              </Link>
              <a
                href="#"
                className="inline-flex h-[50px] items-center gap-2.5 border-2 border-ink bg-transparent px-6 font-display text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-bg"
              >
                {t("ctaSaveHistory")}
              </a>
            </div>
          </div>

          <div className="mt-20 grid grid-cols-3 border-t-2 border-b-2 border-ink md:grid-cols-6">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`px-4 py-5 ${
                  i < stats.length - 1 ? "border-r border-line" : ""
                }`}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  {s.label}
                </div>
                <div
                  className={`mt-1.5 font-display text-4xl font-extrabold leading-none tracking-[-0.02em] ${
                    s.accent ? "text-accent" : ""
                  }`}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-[1320px] px-8">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
            {t("featuresTag")}
          </div>
          <h2 className="m-0 mb-14 font-display text-[clamp(48px,6vw,88px)] font-bold tracking-[-0.02em]">
            {t("featuresHeadingPre")}{" "}
            <i className="not-italic text-accent">
              {t("featuresHeadingAccent")}
            </i>
            <br />
            {t("featuresHeadingPost")}
          </h2>
          <div className="grid grid-cols-2 border-t border-ink md:grid-cols-4">
            {FEATURE_KEYS.map((key, i) => (
              <div
                key={key}
                className={`px-4 py-6 ${
                  i < FEATURE_KEYS.length - 1 ? "border-r border-line" : ""
                }`}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                  {t(`features.${key}.num`)}
                </span>
                <h3 className="my-2.5 font-display text-[22px] font-bold tracking-[-0.01em]">
                  {t(`features.${key}.title`)}
                </h3>
                <p className="m-0 text-sm leading-[1.7] text-ink-2">
                  {t(`features.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
