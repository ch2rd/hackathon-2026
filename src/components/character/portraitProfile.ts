import type { CharacterPublic } from '../../types/models';

export type PortraitRole =
  | 'butler'
  | 'doctor'
  | 'lawyer'
  | 'artist'
  | 'detective'
  | 'servant'
  | 'bride'
  | 'groom'
  | 'bridesmaid'
  | 'planner'
  | 'heir'
  | 'scholar'
  | 'keeper'
  | 'antique'
  | 'conductor'
  | 'reporter'
  | 'attendant'
  | 'merchant'
  | 'student'
  | 'generic';

export type HairStyle = 'short' | 'side-part' | 'long' | 'bun' | 'messy' | 'slick' | 'wavy';
export type Accessory = 'none' | 'glasses' | 'monocle' | 'hat' | 'veil' | 'headband' | 'tie' | 'scarf' | 'camera' | 'lantern' | 'book';
export type Expression = 'calm' | 'tired' | 'sharp' | 'sly' | 'gentle' | 'stern';
export type FaceShape = 'oval' | 'round' | 'angular';

export interface PortraitProfile {
  role: PortraitRole;
  hairStyle: HairStyle;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  outfitColor: string;
  accentColor: string;
  accessory: Accessory;
  expression: Expression;
  faceShape: FaceShape;
  ageLines: boolean;
  youthful: boolean;
  mark: 'none' | 'beauty-mark' | 'scar' | 'freckles';
  earring: boolean;
  hairpin: boolean;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 100003;
  }
  return hash;
}

function detectRole(identity: string): PortraitRole {
  if (identity.includes('管家')) return 'butler';
  if (identity.includes('医生')) return 'doctor';
  if (identity.includes('律师')) return 'lawyer';
  if (identity.includes('画家')) return 'artist';
  if (identity.includes('侦探')) return 'detective';
  if (identity.includes('女仆') || identity.includes('佣人')) return 'servant';
  if (identity.includes('新娘')) return 'bride';
  if (identity.includes('新郎')) return 'groom';
  if (identity.includes('伴娘')) return 'bridesmaid';
  if (identity.includes('婚礼策划')) return 'planner';
  if (identity.includes('继承人')) return 'heir';
  if (identity.includes('民俗学者')) return 'scholar';
  if (identity.includes('守钟人')) return 'keeper';
  if (identity.includes('古董商')) return 'antique';
  if (identity.includes('列车长')) return 'conductor';
  if (identity.includes('记者')) return 'reporter';
  if (identity.includes('乘务员')) return 'attendant';
  if (identity.includes('商人')) return 'merchant';
  if (identity.includes('学生')) return 'student';
  return 'generic';
}

const roleLooks: Record<PortraitRole, { hair: string; accent: string; outfit: string; accessory: Accessory; expression: Expression }> = {
  butler: { hair: '#1b1714', accent: '#c8a96a', outfit: '#181b22', accessory: 'tie', expression: 'stern' },
  doctor: { hair: '#2b2320', accent: '#8fa8a2', outfit: '#d8d3c8', accessory: 'glasses', expression: 'tired' },
  lawyer: { hair: '#221b18', accent: '#9aa7b8', outfit: '#1b2232', accessory: 'tie', expression: 'stern' },
  artist: { hair: '#3a2a22', accent: '#b08a5a', outfit: '#3a2a22', accessory: 'scarf', expression: 'gentle' },
  detective: { hair: '#24201c', accent: '#c8a96a', outfit: '#2a2620', accessory: 'hat', expression: 'sharp' },
  servant: { hair: '#2a1e1a', accent: '#d8d3c8', outfit: '#26242a', accessory: 'headband', expression: 'calm' },
  bride: { hair: '#2a1d1b', accent: '#8e1f2f', outfit: '#e6dfd3', accessory: 'veil', expression: 'gentle' },
  groom: { hair: '#1d1a18', accent: '#c8a96a', outfit: '#20242c', accessory: 'tie', expression: 'calm' },
  bridesmaid: { hair: '#3a2430', accent: '#d9a7b0', outfit: '#3a2430', accessory: 'headband', expression: 'gentle' },
  planner: { hair: '#2a2118', accent: '#c8a96a', outfit: '#2a2430', accessory: 'tie', expression: 'sharp' },
  heir: { hair: '#1a1f2a', accent: '#c8a96a', outfit: '#1a1f2a', accessory: 'tie', expression: 'sly' },
  scholar: { hair: '#2a3028', accent: '#8fa08a', outfit: '#2a3028', accessory: 'glasses', expression: 'calm' },
  keeper: { hair: '#4a4038', accent: '#b08a5a', outfit: '#2a241c', accessory: 'hat', expression: 'stern' },
  antique: { hair: '#3a2a1a', accent: '#c8a96a', outfit: '#3a2a1a', accessory: 'monocle', expression: 'sly' },
  conductor: { hair: '#1c2430', accent: '#c8a96a', outfit: '#1c2430', accessory: 'hat', expression: 'stern' },
  reporter: { hair: '#2a2a2a', accent: '#9aa7b8', outfit: '#2a2a2a', accessory: 'camera', expression: 'sharp' },
  attendant: { hair: '#222a36', accent: '#c8a96a', outfit: '#222a36', accessory: 'hat', expression: 'calm' },
  merchant: { hair: '#2a2018', accent: '#c8a96a', outfit: '#2a2018', accessory: 'monocle', expression: 'sly' },
  student: { hair: '#2a2f3a', accent: '#9aa7b8', outfit: '#2a2f3a', accessory: 'book', expression: 'sharp' },
  generic: { hair: '#2b2520', accent: '#c8a96a', outfit: '#25252b', accessory: 'none', expression: 'calm' },
};

const hairPalette = ['#1b1714', '#2a1d18', '#3a2a22', '#4a3428', '#1a1f2a', '#2b2f3a', '#5a4a3a'];
const eyePalette = ['#c8a96a', '#8e1f2f', '#6f8f8a', '#9aa7b8', '#b08a5a', '#7a6a9a'];
const skinPalette = ['#f0d6c2', '#e7c6ad', '#d9b39a', '#c99a7a', '#f3ddcf'];

const roleHair: Record<PortraitRole, HairStyle> = {
  butler: 'slick',
  doctor: 'bun',
  lawyer: 'side-part',
  artist: 'messy',
  detective: 'short',
  servant: 'bun',
  bride: 'long',
  groom: 'side-part',
  bridesmaid: 'wavy',
  planner: 'short',
  heir: 'side-part',
  scholar: 'bun',
  keeper: 'short',
  antique: 'slick',
  conductor: 'short',
  reporter: 'messy',
  attendant: 'bun',
  merchant: 'slick',
  student: 'wavy',
  generic: 'short',
};

export function getPortraitProfile(character: CharacterPublic): PortraitProfile {
  const seed = hashString(`${character.name}|${character.identity}|${character.age}`);
  const role = detectRole(character.identity);
  const look = roleLooks[role];

  const hairStyle = roleHair[role];
  const faceShape: FaceShape =
    character.age >= 36 || look.expression === 'sharp'
      ? 'angular'
      : character.age < 25
        ? 'round'
        : 'oval';

  return {
    role,
    hairStyle,
    hairColor: hairPalette[seed % hairPalette.length],
    eyeColor: eyePalette[(seed >> 2) % eyePalette.length],
    skinTone: skinPalette[(seed >> 3) % skinPalette.length],
    outfitColor: look.outfit,
    accentColor: look.accent,
    accessory: look.accessory,
    expression: look.expression,
    faceShape,
    ageLines: character.age >= 48,
    youthful: character.age < 24,
    mark:
      seed % 11 === 0
        ? 'scar'
        : seed % 7 === 0
          ? 'beauty-mark'
          : seed % 13 === 0
            ? 'freckles'
            : 'none',
    earring: seed % 5 === 0,
    hairpin: role === 'bride' || role === 'bridesmaid' || role === 'servant',
  };
}