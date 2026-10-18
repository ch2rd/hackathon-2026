import { useEffect, useMemo, useState } from 'react';
import { ScriptCard } from '../components/scripts/ScriptCard';
import { ScriptFilters } from '../components/scripts/ScriptFilters';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { SectionHeading } from '../components/ui/SectionHeading';
import { getScripts } from '../api/scripts';
import type { ScriptSummary } from '../types/models';

const genres = ['全部', '硬核', '情感', '恐怖', '欢乐', '推理'];

export default function ScriptLibraryPage() {
  const [keyword, setKeyword] = useState('');
  const [genre, setGenre] = useState('全部');
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getScripts()
      .then((result) => {
        if (active) setScripts(result.items);
      })
      .catch(() => {
        if (active) setError('无法加载剧本列表');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleScripts = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return scripts.filter((script) => {
      const matchesKeyword =
        !query ||
        script.title.toLowerCase().includes(query) ||
        script.summary.toLowerCase().includes(query) ||
        script.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesGenre = genre === '全部' || script.genre === genre;
      return matchesKeyword && matchesGenre;
    });
  }, [scripts, keyword, genre]);

  return (
    <div className="space-y-10 pb-4">
      <SectionHeading
        title="剧本库"
        description="从 4 个完整可玩的剧本里选择一个案件。可以先看简介，再决定要进入哪个现场。"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm">
          <Input
            icon
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索剧本、标签或关键词…"
          />
        </div>
        <ScriptFilters genres={genres} activeGenre={genre} onSelect={setGenre} />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 p-10 text-center text-muted">加载中…</div>
      ) : error ? (
        <EmptyState title="加载失败" description={error} />
      ) : visibleScripts.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleScripts.map((script) => (
            <ScriptCard key={script.id} script={script} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="没有找到符合条件的剧本"
          description="换个关键词，或者把分类切回“全部”，看看其他案件。"
        />
      )}
    </div>
  );
}