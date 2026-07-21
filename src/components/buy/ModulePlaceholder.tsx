import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";

export function ModulePlaceholder({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note: string;
}) {
  return (
    <>
      <MobileOnly>
        <div className="space-y-4 px-4 py-6">
          <h1 className="font-display text-3xl">{title}</h1>
          <p className="text-sm text-ink/65">{note}</p>
          <div className="rounded-lg border border-dashed border-line p-6 font-mono-num text-xs tracking-wide text-ink/45">
            GRID MODULE · STAGED FOR M3
          </div>
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8">
          <PageHeader kicker={kicker} title={title} description={note} />
          <div className="max-w-2xl rounded-xl border border-dashed border-line bg-paper p-10">
            <p className="font-mono-num text-[11px] tracking-[0.16em] text-ink/40">
              DESKTOP CONSOLE · MODULE INCOMING M3
            </p>
            <p className="mt-4 text-ink/60">
              This service will use the same wallet debit + PIN + status trail pattern as data
              and airtime, with a two-column operator layout on desktop.
            </p>
          </div>
        </div>
      </DesktopOnly>
    </>
  );
}
