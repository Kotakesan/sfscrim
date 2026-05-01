import type { ReactNode } from "react";
import { PageShell } from "@/components/page-shell";

interface LegalShellProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

export function LegalShell({ title, lastUpdated, children }: LegalShellProps) {
  return (
    <PageShell maxWidth="narrow">
      <article>
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
    </PageShell>
  );
}
