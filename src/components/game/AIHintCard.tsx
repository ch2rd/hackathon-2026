import type { AIHint } from '../../types/models';

/**
 * AI 推理助手卡片（B 的 game 组件，/play 页用）。
 *
 * 交互要求（§3.3）：加载态、错误降级提示、不阻塞投票与结局。
 * source === 'mock' 时明确标注降级（§5.5），让演示观众知道当前无 Key。
 */

export interface AIHintCardProps {
  hint: AIHint | null;
  isLoading: boolean;
  /** 请求失败时的提示文案；null = 无错误 */
  error: string | null;
  /** 是否允许发起请求（动作进行中禁用） */
  canAsk: boolean;
  onAsk: () => void;
}

export function AIHintCard({ hint, isLoading, error, canAsk, onAsk }: AIHintCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-700 bg-neutral-900 p-4" data-testid="ai-hint-card">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">AI 推理助手</h3>
        <button
          type="button"
          disabled={!canAsk || isLoading}
          onClick={onAsk}
          className="rounded-md border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {isLoading ? '正在思考…' : hint ? '重新推理' : '让 AI 梳理线索'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-amber-300">
          {error}——AI 暂时不可用，不影响你继续投票和查看结局。
        </p>
      )}

      {hint && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-300">{hint.summary}</p>
          <ul className="flex flex-col gap-2">
            {hint.suspects.map((suspect) => (
              <li key={suspect.playerId} className="rounded-md border border-neutral-800 p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{suspect.name}</span>
                  <span className="text-neutral-400">嫌疑 {suspect.confidence}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-neutral-800">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.min(Math.max(suspect.confidence, 0), 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-neutral-400">{suspect.reason}</p>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 text-xs text-neutral-500">
            <span
              className={
                hint.source === 'mock'
                  ? 'rounded bg-amber-950 px-1.5 py-0.5 text-amber-400'
                  : 'rounded bg-neutral-800 px-1.5 py-0.5'
              }
            >
              {hint.source === 'mock' ? '降级模式（无 AI Key）' : 'AI 推理'}
            </span>
            {hint.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
