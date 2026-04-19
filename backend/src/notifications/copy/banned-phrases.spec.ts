import {
  findBannedPhrase,
  findStreakMention,
  normalizeForMatch,
} from "./banned-phrases.js";

describe("normalizeForMatch", () => {
  it("should lowercase input when given mixed case", () => {
    expect(normalizeForMatch("Your Coach Is DISAPPOINTED")).toBe(
      "your coach is disappointed",
    );
  });

  it("should fold French accents to ASCII base letters", () => {
    expect(normalizeForMatch("Déçu, échoué, série")).toBe(
      "decu, echoue, serie",
    );
  });
});

describe("findBannedPhrase (en)", () => {
  it("should flag parasocial phrasing", () => {
    const hit = findBannedPhrase("We miss you — come on back", "en");
    expect(hit?.pattern).toBe("we miss you");
  });

  it("should flag phantom-emotional phrasing", () => {
    const hit = findBannedPhrase(
      "Your coach is disappointed in the week.",
      "en",
    );
    expect(hit?.pattern).toBe("your coach is disappoint");
  });

  it("should flag shame-based phrasing", () => {
    const hit = findBannedPhrase("You let yourself down this week.", "en");
    expect(hit?.pattern).toBe("you let yourself down");
  });

  it("should flag fake urgency", () => {
    const hit = findBannedPhrase("Last chance to hit today.", "en");
    expect(hit?.pattern).toBe("last chance");
  });

  it("should return null for clean English copy", () => {
    expect(
      findBannedPhrase("Ready for today's plan? One task is enough.", "en"),
    ).toBeNull();
  });
});

describe("findBannedPhrase (fr)", () => {
  it("should flag parasocial phrasing regardless of accents", () => {
    const hit = findBannedPhrase("On est là pour toi quand tu veux.", "fr");
    expect(hit?.pattern).toBe("on est la pour toi");
  });

  it("should flag phantom-emotional phrasing", () => {
    const hit = findBannedPhrase("Ton coach est déçu cette semaine.", "fr");
    expect(hit?.pattern).toBe("ton coach est decu");
  });

  it("should return null for clean French copy", () => {
    expect(
      findBannedPhrase("Prêt pour le plan du jour ? Une tâche suffit.", "fr"),
    ).toBeNull();
  });
});

describe("findStreakMention", () => {
  it("should flag 'streak' as an English word", () => {
    const hit = findStreakMention("Keep your streak going.", "en");
    expect(hit?.pattern).toBe("streak");
  });

  it("should flag 'série' as a French word after accent folding", () => {
    const hit = findStreakMention("Continue ta série aujourd'hui.", "fr");
    expect(hit?.pattern).toBe("serie");
  });

  it("should not match 'sérieusement' as a streak stem", () => {
    // Word-boundary: 'serie' inside 'serieusement' must not trigger.
    expect(findStreakMention("Parlons sérieusement.", "fr")).toBeNull();
  });

  it("should return null when streak terms are absent", () => {
    expect(findStreakMention("One task today is enough.", "en")).toBeNull();
  });
});
