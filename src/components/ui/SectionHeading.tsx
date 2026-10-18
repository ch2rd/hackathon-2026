interface SectionHeadingProps {
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export function SectionHeading({ title, description, align = 'left' }: SectionHeadingProps) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px w-8 bg-gold/60" />
        <span className="text-[11px] uppercase tracking-[0.32em] text-gold">Truth Bureau</span>
      </div>
      <h2 className="font-display text-2xl leading-snug text-paper md:text-3xl">{title}</h2>
      {description && (
        <p className="mt-3 text-sm leading-7 text-muted md:text-base">{description}</p>
      )}
    </div>
  );
}