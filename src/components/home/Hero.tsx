import { Link } from 'react-router-dom';
import type { ScriptSummary } from '../../types/models';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { ScriptCover } from '../scripts/ScriptCover';

interface HeroProps {
  featuredScript: ScriptSummary;
}

export function Hero({ featuredScript }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#101018] via-[#14141d] to-[#0b0b0f] px-6 py-12 md:px-12 md:py-16">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_15%_10%,rgba(200,169,106,0.12),transparent_35%),radial-gradient(circle_at_85%_90%,rgba(142,31,47,0.16),transparent_40%)]" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full border border-white/5" />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Tag variant="gold" className="mb-6">
            在线剧本杀 · 沉浸式推理
          </Tag>
          <h1 className="font-display text-4xl leading-tight text-paper md:text-6xl">
            真相，从来不会
            <br />
            自己浮出水面。
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted md:text-base">
            进入角色，读取只属于你的秘密，在谎言拼成的现场里找出唯一真相。每一局都是一次不可复制的推理现场。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/scripts">
              <Button size="lg">开始游戏</Button>
            </Link>
            <Link to="/scripts">
              <Button size="lg" variant="secondary">
                探索剧本
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[24px] border border-gold/10" />
          <div className="relative rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.3em] text-gold">本周推荐</span>
              <span className="text-[11px] text-muted">CASE 01</span>
            </div>
            <ScriptCover
              title={featuredScript.title}
              genre={featuredScript.genre}
              className="aspect-[4/3]"
            />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-paper">{featuredScript.title}</h3>
                <p className="mt-1 text-xs text-muted">
                  {featuredScript.playerCount} 人 · {featuredScript.durationMinutes} 分钟 ·{' '}
                  {featuredScript.genre}
                </p>
              </div>
              <Link
                to={`/scripts/${featuredScript.id}`}
                className="text-xs tracking-[0.18em] text-gold transition hover:text-paper"
              >
                查看 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}