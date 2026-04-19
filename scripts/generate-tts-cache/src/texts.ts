import type { Language } from "./coaches.ts";

export const UNIVERSAL_BATCH_1: Record<Language, readonly string[]> = {
  en: [
    "Which best describes your starting point with this?",
    "What specifically will you be able to do, have, or experience when this is achieved \u2014 something you can't today?",
    "How many hours per week can you realistically protect for this \u2014 even on your busiest weeks?",
    "When do you want to be able to say 'I did this'?",
    "Most people reach a moment where something shifts from 'I should do this' to 'I need to do this now.' What was that moment for you?",
  ],
  fr: [
    "Qu'est-ce qui d\u00e9crit le mieux ton point de d\u00e9part ?",
    "Que pourras-tu faire, avoir ou vivre concr\u00e8tement quand ce sera atteint \u2014 quelque chose que tu ne peux pas aujourd'hui ?",
    "Combien d'heures par semaine peux-tu r\u00e9ellement consacrer \u00e0 \u00e7a \u2014 m\u00eame dans tes semaines les plus charg\u00e9es ?",
    "Quand veux-tu pouvoir dire \u00ab je l'ai fait \u00bb ?",
    "La plupart des gens atteignent un moment o\u00f9 quelque chose bascule de \u00ab je devrais le faire \u00bb \u00e0 \u00ab il faut que je le fasse maintenant \u00bb. Quel a \u00e9t\u00e9 ce moment pour toi ?",
  ],
};

export const COACH_INTROS: Record<number, Record<Language, string>> = {
  1: {
    en: "Hey, I'm your motivator. Let's make this goal happen.",
    fr: "Salut, je suis ton coach motivateur. On va y arriver ensemble.",
  },
  2: {
    en: "Hello. I'm here to walk this path with you, one step at a time.",
    fr: "Bonjour. Je suis l\u00e0 pour t'accompagner, pas \u00e0 pas.",
  },
  3: {
    en: "I'm your coach. No excuses. Let's get to work.",
    fr: "Je suis ton coach. Pas d'excuses. On se met au travail.",
  },
  4: {
    en: "Hey, I'm your buddy. We've got this \u2014 let's do it together.",
    fr: "Salut, je suis ton complice. On va faire \u00e7a ensemble.",
  },
};
