import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const MAX_WIDTH_CLASS = {
  narrow: "max-w-[820px]",
  wide: "max-w-[1080px]",
} as const;

interface PageShellProps {
  maxWidth?: keyof typeof MAX_WIDTH_CLASS;
  children: ReactNode;
}

export function PageShell({ maxWidth = "narrow", children }: PageShellProps) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section
          className={`mx-auto ${MAX_WIDTH_CLASS[maxWidth]} px-6 pt-10 pb-16 sm:px-8 sm:pt-14 sm:pb-20`}
        >
          {children}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
