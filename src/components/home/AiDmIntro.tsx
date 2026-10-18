import { Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Tag } from '../ui/Tag';

export function AiDmIntro() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative bg-gradient-to-br from-[#151520] to-[#0b0b0f] p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_30%_20%,rgba(200,169,106,0.14),transparent_45%)]" />
          <div className="relative">
            <Tag variant="gold" className="mb-5">
              AI DM
            </Tag>
            <h3 className="font-display text-2xl text-paper">它不告诉你答案，只帮你把线索排好。</h3>
            <p className="mt-4 text-sm leading-7 text-muted">
              AI 推理助手只读取你已经获得的线索，给你一个可能的推理方向。它不会剧透凶手，也不会替你做决定。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag>线索归纳</Tag>
              <Tag>动机排序</Tag>
              <Tag>时间线梳理</Tag>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/10 p-6 md:border-l md:border-t-0 md:p-8">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-gold">AI DM</div>
            <p className="text-sm leading-7 text-paper/90">
              “根据你已获得的线索，林墨与苏晚在停电前的接触仍然无法解释。建议优先核实两人当晚的行踪。”
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-muted">你的推理</div>
            <p className="text-sm leading-7 text-muted">
              “苏晚为什么会在这个时间去书房？她知道老爷要见别人吗？”
            </p>
          </div>
          <div className="flex gap-3">
            <Input placeholder="向 AI DM 提问…" className="flex-1" />
            <Button>
              <Sparkles className="h-4 w-4" />
              提问
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}