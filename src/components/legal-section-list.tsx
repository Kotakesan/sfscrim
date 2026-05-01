export type LegalSection = { heading: string; body: string };

interface LegalSectionListProps {
  intro: string;
  sections: LegalSection[];
}

export function LegalSectionList({ intro, sections }: LegalSectionListProps) {
  return (
    <>
      <p className="m-0 text-base leading-[1.8] text-ink">{intro}</p>
      <div className="mt-10 flex flex-col gap-8">
        {sections.map((sec) => (
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
