import { Bot, Fingerprint, MessagesSquare } from 'lucide-react';
import { Card } from '../ui/Card';

const features = [
  {
    icon: Fingerprint,
    title: '独立角色秘密',
    description: '每个玩家拿到的信息都不同。秘密只对本人可见，真相要靠讨论拼出来。',
  },
  {
    icon: MessagesSquare,
    title: '多幕剧情推进',
    description: '剧本按幕推进，线索逐层揭开。每一幕都会改变你对每个人的判断。',
  },
  {
    icon: Bot,
    title: 'AI DM 推理助手',
    description: 'AI 只根据你已获得的线索给出推理方向，不会直接公布凶手。',
  },
];

export function FeatureGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {features.map((feature) => (
        <Card key={feature.title} interactive className="p-6">
          <div className="mb-5 inline-flex rounded-xl border border-gold/20 bg-gold/10 p-3">
            <feature.icon className="h-5 w-5 text-gold" />
          </div>
          <h3 className="font-display text-lg text-paper">{feature.title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted">{feature.description}</p>
        </Card>
      ))}
    </div>
  );
}