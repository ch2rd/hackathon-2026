import type { SpriteRole } from './visuals';

/**
 * 程序化人物立绘剪影（B 的 game 组件）。
 * 用 SVG 画一个深色人形剪影，再按身份（管家/医生/记者/女仆/园丁/继承人）
 * 叠加金色轮廓的配饰细节，做到「一眼认得身份」又不依赖任何图片素材。
 */

interface CharacterSpriteProps {
  role: SpriteRole;
  name?: string;
  className?: string;
}

const PAPER = '#f5f1e8';
const GOLD = '#c8a96a';

export function CharacterSprite({ role, name, className }: CharacterSpriteProps) {
  return (
    <svg
      viewBox="0 0 120 220"
      className={className}
      role="img"
      aria-label={name ? `${name}的立绘剪影` : '人物立绘剪影'}
    >
      {/* 基础人形剪影 */}
      <circle cx="60" cy="30" r="17" fill="#0a0a0e" stroke={PAPER} strokeOpacity="0.16" strokeWidth="1.5" />
      <path
        d="M40 50 Q60 42 80 50 L92 150 Q60 158 28 150 Z"
        fill="#0a0a0e"
        stroke={PAPER}
        strokeOpacity="0.16"
        strokeWidth="1.5"
      />
      <rect x="36" y="150" width="13" height="58" rx="3" fill="#0a0a0e" />
      <rect x="71" y="150" width="13" height="58" rx="3" fill="#0a0a0e" />

      {renderRoleDetail(role)}
    </svg>
  );
}

function renderRoleDetail(role: SpriteRole) {
  switch (role) {
    case 'butler':
      return (
        <>
          <rect x="38" y="10" width="44" height="16" rx="2" fill="#0a0a0e" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1.5" />
          <rect x="28" y="24" width="64" height="6" rx="3" fill="#0a0a0e" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1" />
          <circle cx="60" cy="52" r="5" fill="none" stroke={GOLD} strokeOpacity="0.6" strokeWidth="1.5" />
        </>
      );
    case 'doctor':
      return (
        <>
          <rect x="84" y="80" width="18" height="22" rx="2" fill="none" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1.5" />
          <line x1="60" y1="54" x2="60" y2="146" stroke={GOLD} strokeOpacity="0.22" strokeWidth="1" />
        </>
      );
    case 'reporter':
      return (
        <>
          <rect x="46" y="70" width="28" height="18" rx="2" fill="none" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1.5" />
          <circle cx="60" cy="79" r="5" fill="none" stroke={GOLD} strokeOpacity="0.5" strokeWidth="1.5" />
        </>
      );
    case 'maid':
      return (
        <>
          <path d="M50 8 Q60 0 70 8 Q60 12 50 8" fill="none" stroke={GOLD} strokeOpacity="0.6" strokeWidth="1.5" />
          <path d="M42 96 Q60 88 78 96 L78 140 Q60 132 42 140 Z" fill="none" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1.5" />
        </>
      );
    case 'gardener':
      return (
        <>
          <path d="M28 22 Q60 2 92 22" fill="none" stroke={GOLD} strokeOpacity="0.5" strokeWidth="2" />
          <line x1="86" y1="44" x2="104" y2="120" stroke={GOLD} strokeOpacity="0.4" strokeWidth="2" />
        </>
      );
    case 'heir':
      return (
        <>
          <path d="M60 52 L54 66 L60 62 L66 66 Z" fill="none" stroke={GOLD} strokeOpacity="0.55" strokeWidth="1.5" />
          <line x1="60" y1="66" x2="60" y2="86" stroke={GOLD} strokeOpacity="0.55" strokeWidth="1.5" />
        </>
      );
    case 'generic':
    default:
      return null;
  }
}
