export type Language = "en" | "fr";

export interface Coach {
  id: number;
  personality: string;
  voiceIds: Record<Language, string>;
}

export const COACHES: readonly Coach[] = [
  {
    id: 1,
    personality: "motivateur",
    voiceIds: {
      en: "e79RFuEzhsq38bytJLIt",
      fr: "5jCmrHdxbpU36l1wb3Ke",
    },
  },
  {
    id: 2,
    personality: "zen",
    voiceIds: {
      en: "6rOxfAnZpbM3VIEhFaeV",
      fr: "oQZyHVc6FnIvc9bYS5yl",
    },
  },
  {
    id: 3,
    personality: "strict",
    voiceIds: {
      en: "Bj9UqZbhQsanLzgalpEG",
      fr: "CjJbxXkk5gtX5aEnDn7y",
    },
  },
  {
    id: 4,
    personality: "complice",
    voiceIds: {
      en: "T720RsqorTx4ZZWohrNN",
      fr: "tLK6fPv15M0oKv4V3ACR",
    },
  },
] as const;

export const LANGUAGES: readonly Language[] = ["en", "fr"] as const;
