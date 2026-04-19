export type CoachConfig = {
  id: number;
  personality: string;
  displayName: { en: string; fr: string };
  description: { en: string; fr: string };
  icon: string;
  elevenlabsVoiceId: { en: string; fr: string };
};

export type PublicCoach = Omit<CoachConfig, "elevenlabsVoiceId">;

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
    elevenlabsVoiceId: {
      en: "e79RFuEzhsq38bytJLIt",
      fr: "5jCmrHdxbpU36l1wb3Ke",
    },
  },
  {
    id: 2,
    personality: "zen",
    displayName: { en: "The Zen", fr: "Le Zen" },
    description: { en: "Calm and soothing", fr: "Calme et apaisant" },
    icon: "leaf",
    elevenlabsVoiceId: {
      en: "6rOxfAnZpbM3VIEhFaeV",
      fr: "oQZyHVc6FnIvc9bYS5yl",
    },
  },
  {
    id: 3,
    personality: "strict",
    displayName: { en: "The Strict", fr: "Le Strict" },
    description: { en: "Firm and authoritative", fr: "Ferme et structurant" },
    icon: "bolt",
    elevenlabsVoiceId: {
      en: "Bj9UqZbhQsanLzgalpEG",
      fr: "CjJbxXkk5gtX5aEnDn7y",
    },
  },
  {
    id: 4,
    personality: "complice",
    displayName: { en: "The Buddy", fr: "Le Complice" },
    description: { en: "Warm and friendly", fr: "Chaleureux et bienveillant" },
    icon: "heart",
    elevenlabsVoiceId: {
      en: "T720RsqorTx4ZZWohrNN",
      fr: "tLK6fPv15M0oKv4V3ACR",
    },
  },
] as const;

export const COACH_BY_ID: ReadonlyMap<number, CoachConfig> = new Map(
  COACHES.map((c) => [c.id, c]),
);
