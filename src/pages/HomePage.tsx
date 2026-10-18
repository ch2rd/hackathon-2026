import { useEffect, useState } from 'react';
import { AiDmIntro } from '../components/home/AiDmIntro';
import { FeatureGrid } from '../components/home/FeatureGrid';
import { FeaturedScripts } from '../components/home/FeaturedScripts';
import { Hero } from '../components/home/Hero';
import { SectionHeading } from '../components/ui/SectionHeading';
import { getScripts } from '../api/scripts';
import type { ScriptSummary } from '../types/models';

export default function HomePage() {
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getScripts()
      .then((result) => {
        if (active) setScripts(result.items);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const featured = scripts.slice(0, 2);
  const heroScript = featured[0];

  return (
    <div className="space-y-16 pb-4">
      {heroScript && <Hero featuredScript={heroScript} />}

      <section className="space-y-8">
        <SectionHeading
          title="推荐剧本"
          description="每一局都从选择一个案件开始。这里是我们最推荐的两个开局剧本。"
        />
        {loading ? (
          <div className="rounded-2xl border border-white/10 p-10 text-center text-muted">加载中…</div>
        ) : (
          <FeaturedScripts scripts={featured} />
        )}
      </section>

      <section className="space-y-8">
        <SectionHeading
          title="为什么是《真相局》"
          description="我们不是做一个剧本展示网站，而是做一个真的可以玩的线上剧本杀。"
        />
        <FeatureGrid />
      </section>

      <section className="space-y-8">
        <SectionHeading
          title="AI DM 推理助手"
          description="AI 不会告诉你凶手是谁，它只帮你整理你已经获得的线索。"
        />
        <AiDmIntro />
      </section>
    </div>
  );
}