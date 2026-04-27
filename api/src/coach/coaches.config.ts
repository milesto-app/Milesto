export type CoachConfig = {
  id: number;
  personality: string;
  displayName: { en: string; fr: string };
  description: { en: string; fr: string };
  icon: string;
};

export type PublicCoach = CoachConfig;

export const COACHES: readonly CoachConfig[] = [
  {
    id: 1,
    personality: "motivateur",
    displayName: { en: "The Motivator", fr: "Le Motivateur" },
    description: {
      en: "Energetic and enthusiastic",
      fr: "Energique et enthousiaste",
    },
    icon: "flame",
  },
  {
    id: 2,
    personality: "zen",
    displayName: { en: "The Zen", fr: "Le Zen" },
    description: { en: "Calm and soothing", fr: "Calme et apaisant" },
    icon: "leaf",
  },
  {
    id: 3,
    personality: "strict",
    displayName: { en: "The Strict", fr: "Le Strict" },
    description: { en: "Firm and authoritative", fr: "Ferme et structurant" },
    icon: "bolt",
  },
  {
    id: 4,
    personality: "complice",
    displayName: { en: "The Buddy", fr: "Le Complice" },
    description: { en: "Warm and friendly", fr: "Chaleureux et bienveillant" },
    icon: "heart",
  },
] as const;

export const COACH_BY_ID: ReadonlyMap<number, CoachConfig> = new Map(
  COACHES.map((c) => [c.id, c]),
);
