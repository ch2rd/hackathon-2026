import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { askAiDm } from '../../api/ai';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Tag } from '../ui/Tag';
import type { AIChatReply } from '../../types/models';

const DEFAULT_ANSWER =
  '根据你已获得的线索，林墨与苏晚在停电前的接触仍然无法解释。建议优先核实两人当晚的行踪。';
const DEFAULT_QUESTION = '苏晚为什么会在这个时间去书房？她知道老爷要见别人吗？';

export function AiDmIntro() {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(DEFAULT_QUESTION);
  const [reply, setReply] = useState<AIChatReply | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await askAiDm(trimmed);
      setReply(result);
      setAsked(trimmed);
      setQuestion('');
    } catch {
      setError('AI DM 暂时没有回应，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.24em] text-gold">AI DM</span>
              {reply && (
                <span
                  className={
                    reply.source === 'mock'
                      ? 'rounded bg-[#3a2c1a] px-2 py-0.5 text-[11px] text-gold/90'
                      : 'rounded bg-white/[0.04] px-2 py-0.5 text-[11px] text-paper/70'
                  }
                >
                  {reply.source === 'mock' ? '演示模式' : 'AI 在线'}
                </span>
              )}
            </div>
            <p className="text-sm leading-7 text-paper/90">{reply ? reply.answer : DEFAULT_ANSWER}</p>
            {reply && <p className="mt-2 text-xs text-muted">{reply.disclaimer}</p>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-muted">你的推理</div>
            <p className="text-sm leading-7 text-muted">{asked}</p>
          </div>

          <form
            className="flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAsk();
            }}
          >
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="向 AI DM 提问…"
              maxLength={200}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !question.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? '思考中…' : '提问'}
            </Button>
          </form>
          {error && <p className="text-sm text-[#e5a4ae]">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
