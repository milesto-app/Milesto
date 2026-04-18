export type CoachConfig = {
  id: number;
  personality: string;
  displayName: { en: string; fr: string };
  description: { en: string; fr: string };
  icon: string;
  elevenlabsVoiceId: string;
};

export const COACHES: readonly CoachConfig[] = [
  {
    id: 1,
    personality: 'motivateur',
    displayName: { en: 'The Motivator', fr: 'Le Motivateur' },
    description: {
      en: 'Energetic and enthusiastic',
      fr: 'Energique et enthousiaste',
    },
    icon: 'flame',
    elevenlabsVoiceId: 'Kore',
  },
  {
    id: 2,
    personality: 'zen',
    displayName: { en: 'The Zen', fr: 'Le Zen' },
    description: { en: 'Calm and soothing', fr: 'Calme et apaisant' },
    icon: 'leaf',
    elevenlabsVoiceId: 'Aoede',
  },
  {
    id: 3,
    personality: 'strict',
    displayName: { en: 'The Strict', fr: 'Le Strict' },
    description: { en: 'Firm and authoritative', fr: 'Ferme et structurant' },
    icon: 'bolt',
    elevenlabsVoiceId: 'Charon',
  },
  {
    id: 4,
    personality: 'complice',
    displayName: { en: 'The Buddy', fr: 'Le Complice' },
    description: { en: 'Warm and friendly', fr: 'Chaleureux et bienveillant' },
    icon: 'heart',
    elevenlabsVoiceId: 'Leda',
  },
] as const;

export const COACH_BY_ID: ReadonlyMap<number, CoachConfig> = new Map(
  COACHES.map((c) => [c.id, c]),
);
