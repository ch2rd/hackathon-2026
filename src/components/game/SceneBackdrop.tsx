import type { Genre } from '../../types/models';
import { cn } from '../ui/cn';
import type { SceneKey } from './visuals';

/**
 * 程序化场景背景（B 的 game 组件）。
 * 不依赖任何图片素材：用渐变 + 内联 SVG 剪影 + 雾层拼出氛围，
 * 与现有 ScriptCover 的「CSS 画封面」同一套思路，色板只取 theme.css 的 token。
 */

interface SceneBackdropProps {
  scene: SceneKey;
  genre?: Genre;
  /** 回忆滤镜（CSS filter 字符串，来自 visuals.resolveMemoryFilter）；不传则不套滤镜 */
  memory?: string;
  className?: string;
}

const SCENE_BG: Record<SceneKey, string> = {
  belltower: 'from-[#0e1320] via-[#161d2e] to-[#05060a]',
  study: 'from-[#171210] via-[#241c14] to-[#080503]',
  hall: 'from-[#121218] via-[#1a1a22] to-[#050508]',
  greenhouse: 'from-[#0c1612] via-[#12211a] to-[#040705]',
  pharmacy: 'from-[#0d1518] via-[#142225] to-[#040708]',
  kitchen: 'from-[#17120c] via-[#231a10] to-[#080502]',
  fog: 'from-[#131722] via-[#1c2334] to-[#080a12]',
  night: 'from-[#0b1220] via-[#141d30] to-[#05060c]',
};

const GENRE_GLOW: Record<Genre, string> = {
  推理: 'rgba(200,169,106,0.12)',
  情感: 'rgba(190,90,110,0.14)',
  恐怖: 'rgba(142,31,47,0.18)',
  欢乐: 'rgba(210,160,90,0.12)',
  硬核: 'rgba(90,120,180,0.14)',
};

const GOLD = '#c8a96a';

export function SceneBackdrop({ scene, genre = '推理', memory, className }: SceneBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('absolute inset-0 overflow-hidden bg-gradient-to-b', SCENE_BG[scene], className)}
      style={memory ? { filter: memory } : undefined}
    >
      {/* 类型氛围高光 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 70% 10%, ${GENRE_GLOW[genre]}, transparent 44%)`,
        }}
      />
      {/* 冷色月光 */}
      <div className="absolute right-[10%] top-[6%] h-44 w-44 rounded-full bg-paper/10 blur-2xl" />
      <div className="absolute right-[15%] top-[10%] h-10 w-10 rounded-full bg-paper/20 blur-[2px]" />

      <Silhouette scene={scene} />
      <Fog />

      {/* 底部压暗，托住对话框 */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
    </div>
  );
}

function Silhouette({ scene }: { scene: SceneKey }) {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-full w-full"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden="true"
    >
      {renderSilhouette(scene)}
    </svg>
  );
}

function renderSilhouette(scene: SceneKey) {
  switch (scene) {
    case 'belltower':
      return (
        <>
          <rect x="150" y="92" width="100" height="158" fill="#000" fillOpacity="0.55" />
          <polygon points="150,92 200,28 250,92" fill="#000" fillOpacity="0.55" />
          <circle cx="200" cy="70" r="15" stroke={GOLD} strokeOpacity="0.4" strokeWidth="1.5" />
          <line x1="160" y1="110" x2="240" y2="152" stroke={GOLD} strokeOpacity="0.2" strokeWidth="1" />
          <line x1="160" y1="140" x2="240" y2="182" stroke={GOLD} strokeOpacity="0.2" strokeWidth="1" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
    case 'study':
      return (
        <>
          <rect x="40" y="70" width="120" height="180" fill="#000" fillOpacity="0.5" />
          <line x1="40" y1="120" x2="160" y2="120" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />
          <line x1="40" y1="170" x2="160" y2="170" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />
          <rect x="240" y="150" width="120" height="100" fill="#000" fillOpacity="0.5" />
          <circle cx="300" cy="110" r="18" stroke={GOLD} strokeOpacity="0.28" strokeWidth="1.5" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
    case 'hall':
      return (
        <>
          <path d="M120 250 L120 110 Q200 60 280 110 L280 250" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="22" />
          <line x1="200" y1="40" x2="200" y2="80" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1.5" />
          <line x1="160" y1="80" x2="240" y2="80" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1.5" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
    case 'greenhouse':
      return (
        <>
          <polygon points="60,250 120,90 340,90 400,250" fill="#000" fillOpacity="0.5" />
          <line x1="120" y1="90" x2="230" y2="250" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />
          <line x1="340" y1="90" x2="230" y2="250" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />
          <line x1="160" y1="90" x2="160" y2="250" stroke={GOLD} strokeOpacity="0.14" strokeWidth="1" />
          <line x1="230" y1="90" x2="230" y2="250" stroke={GOLD} strokeOpacity="0.14" strokeWidth="1" />
          <line x1="300" y1="90" x2="300" y2="250" stroke={GOLD} strokeOpacity="0.14" strokeWidth="1" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
    case 'pharmacy':
      return (
        <>
          <rect x="90" y="90" width="220" height="160" fill="#000" fillOpacity="0.5" />
          <line x1="90" y1="130" x2="310" y2="130" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />
          <line x1="90" y1="170" x2="310" y2="170" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />
          <line x1="90" y1="210" x2="310" y2="210" stroke={GOLD} strokeOpacity="0.16" strokeWidth="1" />
          <rect x="120" y="100" width="14" height="24" rx="2" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1" />
          <rect x="150" y="100" width="14" height="24" rx="2" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
    case 'kitchen':
      return (
        <>
          <rect x="60" y="160" width="280" height="90" fill="#000" fillOpacity="0.5" />
          <line x1="200" y1="0" x2="200" y2="110" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1.5" />
          <circle cx="200" cy="118" r="10" fill="none" stroke={GOLD} strokeOpacity="0.35" strokeWidth="1.5" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
    case 'fog':
      return (
        <>
          <rect x="60" y="130" width="60" height="120" fill="#000" fillOpacity="0.4" />
          <rect x="280" y="110" width="70" height="140" fill="#000" fillOpacity="0.4" />
          <circle cx="330" cy="60" r="20" fill="none" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1.5" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
    case 'night':
    default:
      return (
        <>
          <rect x="30" y="150" width="90" height="100" fill="#000" fillOpacity="0.5" />
          <polygon points="30,150 75,108 120,150" fill="#000" fillOpacity="0.5" />
          <rect x="270" y="130" width="100" height="120" fill="#000" fillOpacity="0.5" />
          <polygon points="270,130 320,80 370,130" fill="#000" fillOpacity="0.5" />
          <circle cx="340" cy="60" r="22" fill="none" stroke={GOLD} strokeOpacity="0.35" strokeWidth="1.5" />
          <rect x="0" y="250" width="400" height="50" fill="#000" fillOpacity="0.7" />
        </>
      );
  }
}

function Fog() {
  return (
    <>
      <div className="absolute -left-10 bottom-6 h-24 w-[130%] animate-pulse rounded-full bg-[#9fb0c8]/10 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-32 w-[140%] animate-pulse rounded-full bg-[#c9d4e2]/[0.07] blur-3xl [animation-delay:1.5s]" />
    </>
  );
}
