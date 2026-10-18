/**
 * AI 推理服务（C 维护）。
 *
 * 硬性要求（AGENTS.md §5.5）：
 * - 只喂「当前玩家可见的线索 + 自己的私密线索」，绝不喂凶手 id；
 * - 8 秒超时，无 Key / 超时 / 解析失败一律降级到确定性 Mock 结果；
 * - 用 Zod 校验模型输出，防止前端拿到烂结构。
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { buildAIChatReply } from '../../mocks/mockEngine';
import type { AIChatReply, AIHint } from '../../types/models';
import { ApiError } from '../../utils/apiError';
import { getRoomState, mockHint } from './roomService';

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 8000);

const HintSchema = z.object({
  summary: z.string().min(1),
  suspects: z
    .array(
      z.object({
        playerId: z.string().min(1),
        name: z.string().min(1),
        confidence: z.number().min(0).max(100),
        reason: z.string().min(1),
      }),
    )
    .min(1),
});

/** 容错解析模型输出：剥掉 ```json 围栏，截取首个 `{` 到最后一个 `}`，再 JSON.parse。 */
function parseLenientJson(raw: string): unknown {
  const unboxed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = unboxed.indexOf('{');
  const end = unboxed.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('模型输出里没有 JSON 对象');
  return JSON.parse(unboxed.slice(start, end + 1));
}

const SYSTEM_PROMPT = [
  '你是一名剧本杀推理助手，只能依据玩家已获得的线索做推断。',
  '要求：',
  '1. 不要编造未提供的线索；没有依据就说「线索不足」。',
  '2. 不要直接断言「凶手就是某人」，只给出嫌疑排序和理由。',
  '3. 只输出 JSON，格式：',
  '{"summary":"一段话总结","suspects":[{"playerId":"...","name":"...","confidence":0-100,"reason":"..."}]}',
].join('\n');

export async function generateHint(roomId: string, playerId: string): Promise<AIHint> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  // 没有 Key 直接降级，不浪费一次等待
  if (!apiKey) return mockHint(roomId, playerId);

  // 拿当前玩家视角的数据（readRoomState 已经按「公开 + 自己私密」过滤过）
  const state = await getRoomState(roomId, playerId);
  const clues = state.me.visibleClues.map((clue) => `- ${clue.title}：${clue.content}`);
  const suspects = state.players
    .filter((player) => player.id !== playerId && player.characterName !== null)
    .map((player) => `- playerId=${player.id} 角色=${player.characterName} 昵称=${player.nickname}`);

  if (clues.length === 0) return mockHint(roomId, playerId);

  const userPrompt = [
    '当前玩家可见的线索：',
    clues.join('\n'),
    '',
    '其他玩家：',
    suspects.join('\n'),
    '',
    '请给出嫌疑排序。playerId 必须从上面对应的玩家列表里选，不要自行编造。',
  ].join('\n');

  try {
    const client = new OpenAI({
      apiKey,
      timeout: AI_TIMEOUT_MS,
      maxRetries: 0,
      // 支持走代理 / 兼容网关；留空则用官方默认地址
      baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = HintSchema.safeParse(parseLenientJson(raw));

    if (!parsed.success) {
      console.warn('[ai] 模型输出不符合结构，降级为 Mock');
      return mockHint(roomId, playerId);
    }

    // 防幻觉：只保留真实存在的 playerId
    const validIds = new Set(state.players.map((player) => player.id));
    const filtered = parsed.data.suspects
      .filter((suspect) => validIds.has(suspect.playerId) && suspect.playerId !== playerId)
      .sort((left, right) => right.confidence - left.confidence);

    if (filtered.length === 0) return mockHint(roomId, playerId);

    return {
      summary: parsed.data.summary,
      suspects: filtered.map((suspect) => ({
        playerId: suspect.playerId,
        name: suspect.name,
        confidence: Math.round(suspect.confidence),
        reason: suspect.reason,
      })),
      disclaimer: 'AI 仅根据你已获得的线索推测，不代表真相。',
      source: 'llm',
    };
  } catch (error) {
    // 超时、网络、配额、JSON 解析失败…… 一律降级，接口不能因此挂掉
    console.warn('[ai] 调用失败，降级为 Mock：', (error as Error).message);
    if (error instanceof ApiError && error.code === 'NOT_FOUND') throw error;
    return mockHint(roomId, playerId);
  }
}

const CHAT_SYSTEM_PROMPT = [
  '你是《真相局》的 AI DM，一名剧本杀推理陪练。',
  '要求：',
  '1. 你没有具体案件的信息，不要假装知道某个案子的凶手，也不要编造剧情。',
  '2. 只回答推理方法、玩法规则、如何整理线索这类问题。',
  '3. 如果对方问某个具体案件的真相，说明「进入游戏后我才能看到你的线索」。',
  '4. 用中文，控制在 120 字以内，语气像老练的 DM。',
].join('\n');

/** 首页 AI DM 问答：无房间上下文，只做通用推理陪练，失败降级 Mock。 */
export async function generateChatAnswer(question: string): Promise<AIChatReply> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return buildAIChatReply(question);

  try {
    const client = new OpenAI({
      apiKey,
      timeout: AI_TIMEOUT_MS,
      maxRetries: 0,
      baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.6,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
    });

    const answer = (completion.choices[0]?.message?.content ?? '').trim();
    if (answer === '') return buildAIChatReply(question);

    return {
      answer,
      disclaimer: 'AI DM 仅帮助你整理思路，不剧透凶手，也不替你做决定。',
      source: 'llm',
    };
  } catch (error) {
    console.warn('[ai] AI DM 问答失败，降级为 Mock：', (error as Error).message);
    return buildAIChatReply(question);
  }
}
