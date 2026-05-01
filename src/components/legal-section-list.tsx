export type LegalSection = { heading: string; body: string };

interface LegalSectionListProps {
  intro: string;
  sections: LegalSection[] | undefined;
}

export function LegalSectionList({ intro, sections }: LegalSectionListProps) {
  const safeSections = Array.isArray(sections) ? sections : [];
  return (
    <>
      <p className="m-0 text-base leading-[1.8] text-ink">{intro}</p>
      <div className="mt-10 flex flex-col gap-8">
        {safeSections.map((sec) => (
          <section key={sec.heading}>
            <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.01em]">
              {sec.heading}
            </h2>
            <p className="mt-3 whitespace-pre-line text-base leading-[1.8] text-ink-2">
              {sec.body}
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
