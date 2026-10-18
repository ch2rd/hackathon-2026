import { useId } from 'react';
import type { CharacterPublic } from '../../types/models';
import { cn } from '../ui/cn';
import { getPortraitProfile, type PortraitProfile } from './portraitProfile';

interface CharacterPortraitProps {
  character: CharacterPublic;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-20 w-16',
  md: 'h-28 w-24',
  lg: 'h-44 w-36',
} as const;

function facePath(profile: PortraitProfile): string {
  if (profile.faceShape === 'angular') {
    return 'M58 82 C58 48 78 30 100 30 C122 30 142 48 142 82 L138 120 C134 148 118 162 100 162 C82 162 66 148 62 120 Z';
  }
  if (profile.faceShape === 'round') {
    return 'M58 84 C58 48 78 30 100 30 C122 30 142 48 142 84 L138 118 C136 146 120 160 100 160 C80 160 64 146 62 118 Z';
  }
  return 'M59 82 C59 48 79 30 100 30 C121 30 141 48 141 82 L138 120 C134 148 118 162 100 162 C82 162 66 148 62 120 Z';
}

function HairBack({ profile }: { profile: PortraitProfile }) {
  if (profile.hairStyle === 'long') {
    return (
      <g className="portrait-hair">
        <path d="M48 88 C48 38 72 18 100 18 C128 18 152 38 152 88 L158 174 C142 184 58 184 42 174 Z" fill={profile.hairColor} />
        <path d="M48 90 C40 122 42 156 54 176 L64 170 C55 146 54 116 62 92 Z" fill={profile.hairColor} opacity="0.9" />
        <path d="M152 90 C160 122 158 156 146 176 L136 170 C145 146 146 116 138 92 Z" fill={profile.hairColor} opacity="0.9" />
      </g>
    );
  }
  if (profile.hairStyle === 'wavy') {
    return (
      <g className="portrait-hair">
        <path d="M48 90 C48 40 72 20 100 20 C128 20 152 40 152 90 L154 150 C140 164 60 164 46 150 Z" fill={profile.hairColor} />
        <path d="M50 120 C38 138 46 166 62 174 L70 166 C54 156 54 138 62 124 Z" fill={profile.hairColor} opacity="0.9" />
        <path d="M150 120 C162 138 154 166 138 174 L130 166 C146 156 146 138 138 124 Z" fill={profile.hairColor} opacity="0.9" />
      </g>
    );
  }
  if (profile.hairStyle === 'bun') {
    return (
      <g className="portrait-hair">
        <circle cx="100" cy="22" r="17" fill={profile.hairColor} />
        <path d="M52 90 C52 42 74 24 100 24 C126 24 148 42 148 90 L144 122 C132 108 68 108 56 122 Z" fill={profile.hairColor} />
      </g>
    );
  }
  if (profile.hairStyle === 'messy') {
    return (
      <g className="portrait-hair">
        <path d="M48 92 C44 42 72 20 100 20 C128 20 156 42 152 92 L146 124 L138 104 L130 126 L120 102 L110 126 L100 102 L90 126 L80 102 L70 126 L62 104 L54 124 Z" fill={profile.hairColor} />
      </g>
    );
  }
  return (
    <g className="portrait-hair">
      <path d="M52 90 C52 40 74 22 100 22 C126 22 148 40 148 90 C140 66 128 56 100 56 C72 56 60 66 52 90 Z" fill={profile.hairColor} />
    </g>
  );
}

function HairFront({ profile }: { profile: PortraitProfile }) {
  if (profile.hairStyle === 'slick') {
    return (
      <path d="M56 76 C60 44 80 26 102 28 C128 30 144 52 144 76 C132 58 116 52 100 56 C84 60 70 64 56 76 Z" fill={profile.hairColor} />
    );
  }
  if (profile.hairStyle === 'side-part') {
    return (
      <path d="M56 76 C60 44 80 26 104 28 C130 32 144 52 144 76 C134 56 118 50 100 54 C86 56 70 64 56 76 Z" fill={profile.hairColor} />
    );
  }
  if (profile.hairStyle === 'messy') {
    return (
      <g>
        <path d="M56 76 C60 44 80 26 100 28 C124 28 142 48 144 74 L132 62 L122 76 L110 60 L98 78 L86 62 L74 76 L64 64 Z" fill={profile.hairColor} />
        <path d="M64 66 L50 58 L60 82 Z" fill={profile.hairColor} />
        <path d="M136 64 L150 56 L140 82 Z" fill={profile.hairColor} />
      </g>
    );
  }
  if (profile.hairStyle === 'bun') {
    return (
      <path d="M58 78 C62 46 80 28 100 28 C122 28 140 46 142 76 C132 58 118 52 100 56 C80 60 68 66 58 78 Z" fill={profile.hairColor} />
    );
  }
  if (profile.hairStyle === 'long' || profile.hairStyle === 'wavy') {
    return (
      <g>
        <path d="M56 78 C60 44 80 26 100 26 C124 26 142 46 144 76 C132 56 116 50 100 54 C82 58 68 66 56 78 Z" fill={profile.hairColor} />
        <path d="M56 76 C50 98 52 118 60 132 L66 126 C58 110 58 92 64 78 Z" fill={profile.hairColor} opacity="0.9" />
        <path d="M144 76 C150 98 148 118 140 132 L134 126 C142 110 142 92 136 78 Z" fill={profile.hairColor} opacity="0.9" />
      </g>
    );
  }
  return (
    <path d="M58 78 C62 46 80 28 100 28 C122 28 140 46 142 76 C132 58 118 52 100 56 C82 60 68 66 58 78 Z" fill={profile.hairColor} />
  );
}
function Eyes({ profile }: { profile: PortraitProfile }) {
  const browTilt = profile.expression === 'stern' || profile.expression === 'sharp' ? 3 : profile.expression === 'tired' ? -2 : 0;
  const mouth =
    profile.expression === 'gentle'
      ? 'M88 137 Q100 144 112 137'
      : profile.expression === 'sly'
        ? 'M88 138 Q100 134 114 139'
        : profile.expression === 'tired'
          ? 'M88 140 Q100 136 112 140'
          : 'M88 138 Q100 141 112 138';
  return (
    <g>
      <g className="portrait-blink" style={{ transformOrigin: '100px 102px' }}>
        <ellipse cx="78" cy="102" rx="13" ry="8" fill="#f7f1e8" />
        <ellipse cx="122" cy="102" rx="13" ry="8" fill="#f7f1e8" />
        <circle cx="78" cy="102" r="7" fill={profile.eyeColor} />
        <circle cx="122" cy="102" r="7" fill={profile.eyeColor} />
        <circle cx="78" cy="102" r="3.2" fill="#171016" />
        <circle cx="122" cy="102" r="3.2" fill="#171016" />
        <circle cx="76" cy="99" r="1.8" fill="#fff" opacity="0.9" />
        <circle cx="120" cy="99" r="1.8" fill="#fff" opacity="0.9" />
        <path d="M65 99 Q78 92 91 99" fill="none" stroke="#2a1c1a" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M109 99 Q122 92 135 99" fill="none" stroke="#2a1c1a" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path d={`M64 ${87 - browTilt} Q78 ${81 - browTilt} 92 ${87 - browTilt}`} fill="none" stroke={profile.hairColor} strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M108 ${87 - browTilt} Q122 ${81 - browTilt} 136 ${87 - browTilt}`} fill="none" stroke={profile.hairColor} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M97 114 Q100 119 104 114" fill="none" stroke="#a8735f" strokeWidth="1.6" strokeLinecap="round" />
      <path d={mouth} fill="none" stroke="#7d3d42" strokeWidth="2" strokeLinecap="round" />
      {profile.ageLines && (
        <g opacity="0.5" stroke="#9b6a5a" strokeWidth="1" strokeLinecap="round">
          <path d="M64 112 Q69 114 74 112" />
          <path d="M126 112 Q131 114 136 112" />
          <path d="M88 147 Q100 150 112 147" />
        </g>
      )}
      {profile.mark === 'beauty-mark' && <circle cx="116" cy="128" r="1.6" fill="#6d3a3f" />}
      {profile.mark === 'scar' && <path d="M70 86 L84 122" stroke="#8f5c4f" strokeWidth="1.4" opacity="0.8" />}
      {profile.mark === 'freckles' && (
        <g fill="#b77b67" opacity="0.6">
          <circle cx="70" cy="120" r="1" />
          <circle cx="75" cy="124" r="1" />
          <circle cx="80" cy="119" r="1" />
          <circle cx="120" cy="120" r="1" />
          <circle cx="125" cy="124" r="1" />
          <circle cx="130" cy="119" r="1" />
        </g>
      )}
    </g>
  );
}

function Collar({ profile }: { profile: PortraitProfile }) {
  if (profile.role === 'doctor') {
    return (
      <g>
        <path d="M66 174 L100 208 L82 228 L58 196 Z" fill="#e8e3d8" opacity="0.95" />
        <path d="M134 174 L100 208 L118 228 L142 196 Z" fill="#e8e3d8" opacity="0.95" />
        <path d="M78 178 Q78 210 100 210 Q122 210 122 178" fill="none" stroke={profile.accentColor} strokeWidth="3" />
        <circle cx="118" cy="208" r="4" fill={profile.accentColor} />
      </g>
    );
  }
  if (profile.role === 'bride' || profile.role === 'bridesmaid') {
    return (
      <g>
        <path d="M62 176 Q100 206 138 176 L148 240 L52 240 Z" fill={profile.outfitColor} />
        <path d="M78 178 Q100 198 122 178" fill="none" stroke={profile.accentColor} strokeWidth="2" />
      </g>
    );
  }
  if (profile.role === 'servant') {
    return (
      <g>
        <path d="M72 178 Q100 202 128 178 L138 240 L62 240 Z" fill="#e8e3d8" opacity="0.88" />
        <path d="M76 180 L100 210 L124 180" fill="none" stroke={profile.accentColor} strokeWidth="1.5" />
      </g>
    );
  }
  if (profile.role === 'detective' || profile.role === 'reporter') {
    return (
      <g>
        <path d="M58 176 L100 204 L142 176 L154 240 L46 240 Z" fill={profile.outfitColor} />
        <path d="M78 180 L100 210 L122 180" fill="none" stroke={profile.accentColor} strokeWidth="2" />
      </g>
    );
  }
  return (
    <g>
      <path d="M58 176 L100 206 L142 176 L154 240 L46 240 Z" fill={profile.outfitColor} />
      <path d="M84 178 L100 198 L116 178" fill="#e8e3d8" opacity="0.95" />
      {profile.accessory === 'tie' && <path d="M100 198 L93 210 L100 238 L107 210 Z" fill={profile.accentColor} />}
    </g>
  );
}

function Accessory({ profile }: { profile: PortraitProfile }) {
  switch (profile.accessory) {
    case 'glasses':
      return (
        <g fill="none" stroke={profile.accentColor} strokeWidth="2">
          <rect x="63" y="92" width="30" height="21" rx="5" />
          <rect x="107" y="92" width="30" height="21" rx="5" />
          <path d="M93 101 Q100 97 107 101" />
          <path d="M63 101 L53 98" />
          <path d="M137 101 L147 98" />
        </g>
      );
    case 'monocle':
      return (
        <g fill="none" stroke={profile.accentColor} strokeWidth="2">
          <circle cx="122" cy="102" r="17" />
          <path d="M138 108 Q154 126 146 152" />
        </g>
      );
    case 'hat':
      return (
        <g>
          <path d="M50 68 Q100 34 150 68 L154 76 L46 76 Z" fill={profile.outfitColor} />
          <path d="M62 66 Q100 46 138 66" fill="none" stroke={profile.accentColor} strokeWidth="3" />
          <path d="M48 74 Q100 88 152 74" fill="none" stroke={profile.accentColor} strokeWidth="2" opacity="0.7" />
        </g>
      );
    case 'veil':
      return (
        <g>
          <path d="M52 64 Q100 6 148 64 L158 154 Q100 176 42 154 Z" fill="#fff" opacity="0.1" />
          <path d="M50 64 Q100 18 150 64" fill="none" stroke="#f5f1e8" strokeWidth="4" opacity="0.5" />
          <circle cx="60" cy="72" r="2" fill={profile.accentColor} />
        </g>
      );
    case 'headband':
      return (
        <g>
          <path d="M58 64 Q100 38 142 64" fill="none" stroke="#f5f1e8" strokeWidth="5" opacity="0.85" />
          <path d="M58 64 Q50 58 48 48 Q58 52 62 58 Z" fill="#f5f1e8" opacity="0.85" />
        </g>
      );
    case 'scarf':
      return <path d="M64 172 Q100 200 136 172 L142 204 Q100 222 58 204 Z" fill={profile.accentColor} opacity="0.8" />;
    case 'camera':
      return (
        <g>
          <rect x="118" y="190" width="31" height="21" rx="4" fill="#171316" stroke={profile.accentColor} />
          <circle cx="134" cy="200" r="7" fill="#2a2428" stroke={profile.accentColor} />
          <circle cx="134" cy="200" r="3" fill={profile.accentColor} opacity="0.7" />
        </g>
      );
    case 'lantern':
      return (
        <g>
          <rect x="128" y="180" width="14" height="22" rx="3" fill="#1a1410" stroke={profile.accentColor} />
          <rect x="131" y="184" width="8" height="10" fill={profile.accentColor} className="portrait-flicker" />
        </g>
      );
    case 'book':
      return (
        <g transform="rotate(-8 136 198)">
          <rect x="122" y="188" width="28" height="20" rx="2" fill={profile.accentColor} opacity="0.75" />
          <path d="M136 188 L136 208" stroke="#1a1418" strokeWidth="1" />
        </g>
      );
    case 'tie':
      return <path d="M100 198 L93 210 L100 238 L107 210 Z" fill={profile.accentColor} />;
    default:
      return null;
  }
}
export function CharacterPortrait({ character, size = 'md', className }: CharacterPortraitProps) {
  const profile = getPortraitProfile(character);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bgId = `bg-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-xl border border-gold/25 bg-[#0d0b0a] shadow-[0_0_30px_-12px_rgba(200,169,106,0.45)]',
        sizeClasses[size],
        className,
      )}
      title={`${character.name} · ${character.identity}`}
    >
      <svg viewBox="0 0 200 240" className="h-full w-full" role="img" aria-label={`${character.name}，${character.identity}，${character.age} 岁`}>
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1d1714" />
            <stop offset="55%" stopColor="#100d12" />
            <stop offset="100%" stopColor="#08070a" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="38%" r="58%">
            <stop offset="0%" stopColor={profile.accentColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={profile.accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="200" height="240" fill={`url(#${bgId})`} />
        <circle cx="100" cy="94" r="92" fill={`url(#${glowId})`} className="portrait-glow" />
        <path d="M0 212 Q50 196 100 212 T200 212 L200 240 L0 240 Z" fill="#08070a" opacity="0.8" />
        <g opacity="0.18" fill={profile.accentColor}>
          <circle cx="28" cy="38" r="1" />
          <circle cx="170" cy="58" r="1.4" />
          <circle cx="154" cy="24" r="0.8" />
          <circle cx="38" cy="176" r="1.2" />
        </g>

        <g className="portrait-breathe">
          <Collar profile={profile} />
          <rect x="86" y="146" width="28" height="36" rx="12" fill={profile.skinTone} />
          <ellipse cx="56" cy="106" rx="8" ry="13" fill={profile.skinTone} />
          <ellipse cx="144" cy="106" rx="8" ry="13" fill={profile.skinTone} />
          {profile.earring && <circle cx="55" cy="118" r="2.2" fill={profile.accentColor} />}

          <HairBack profile={profile} />
          <path d={facePath(profile)} fill={profile.skinTone} />
          {profile.youthful && <ellipse cx="100" cy="143" rx="20" ry="8" fill="#d98f86" opacity="0.13" />}
          <HairFront profile={profile} />
          {profile.hairpin && <path d="M62 62 L76 54" stroke={profile.accentColor} strokeWidth="3" strokeLinecap="round" />}

          <Eyes profile={profile} />
          <Accessory profile={profile} />
        </g>

        <rect x="3" y="3" width="194" height="234" rx="16" fill="none" stroke={profile.accentColor} strokeOpacity="0.32" strokeWidth="1.5" />
        <path d="M12 24 Q12 12 24 12" fill="none" stroke={profile.accentColor} strokeOpacity="0.6" strokeWidth="2" />
        <path d="M188 216 Q188 228 176 228" fill="none" stroke={profile.accentColor} strokeOpacity="0.6" strokeWidth="2" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,transparent_35%,rgba(0,0,0,0.45)_100%)]" />
    </div>
  );
}