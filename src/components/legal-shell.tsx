import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

interface LegalShellProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

export function LegalShell({ title, lastUpdated, children }: LegalShellProps) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-[820px] px-6 pt-10 pb-16 sm:px-8 sm:pt-14 sm:pb-20">
          <header className="mb-10 border-b-2 border-ink pb-6">
            <h1 className="m-0 font-display text-[clamp(36px,6vw,64px)] font-extrabold leading-[1] tracking-[-0.02em]">
              {title}
            </h1>
            {lastUpdated ? (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {lastUpdated}
              </p>
            ) : null}
          </header>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
