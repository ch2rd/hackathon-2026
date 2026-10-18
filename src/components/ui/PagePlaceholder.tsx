interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface/80 p-8 shadow-2xl">
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Truth Bureau</p>
      <h1 className="font-display text-3xl text-paper md:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted md:text-base">{description}</p>
      <div className="mt-8 rounded-xl border border-dashed border-white/15 p-6 text-sm text-muted">
        页面骨架已就绪，等待下一阶段实现。
      </div>
    </section>
  );
}