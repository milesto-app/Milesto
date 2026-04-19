// Strict retry-prompt builder (M2.9.2).
//
// Used by copy-gen.service.ts on the second attempt after a first
// attempt fails parse or semantic validation. We re-send the original
// system prompt plus an appended instruction block that enumerates the
// banned-phrase categories. Telling the model the categories rather
// than the exact stems prevents it from learning to paraphrase around
// a literal list while still tightening behavior.

import type { SupportedLanguage } from "../fallbacks.js";
import type { SystemPrompt } from "./system-prompts.js";

const STRICT_APPENDIX_EN = `

STRICT RETRY — the previous attempt failed validation. Re-read the hard rules
above. In particular, avoid every one of these categories (do not reproduce
examples, they are illustrative):
  - Parasocial: "we miss you", "we're here for you", "come back".
  - Phantom emotions: any claim that you or the coach feels something
    about the user (disappointed, proud, worried, sad).
  - Shame: "you failed", "you let yourself down", "giving up on yourself".
  - Fake urgency / social proof: "last chance", "everyone is ahead of you",
    "users like you", "people like you".

If you cannot write a push without touching one of these categories, return
the safest, most neutral alternative that still addresses the user's context.
`.trim();

const STRICT_APPENDIX_FR = `

NOUVELLE TENTATIVE STRICTE — la première tentative a échoué à la validation.
Relis les règles strictes ci-dessus. En particulier, évite chacune de ces
catégories (ne reproduis pas les exemples, ils sont illustratifs) :
  - Parasocial : "tu nous manques", "on est là pour toi", "reviens".
  - Émotions fantômes : toute affirmation que toi ou le coach ressent
    quelque chose à propos de l'utilisateur (déçu, fier, inquiet, triste).
  - Honte : "tu as échoué", "tu t'es laissé tomber", "tu abandonnes".
  - Fausse urgence / preuve sociale : "dernière chance", "tout le monde
    est en avance", "les utilisateurs comme toi", "les gens comme toi".

Si tu ne peux pas écrire un push sans toucher à l'une de ces catégories,
renvoie l'alternative la plus neutre et sûre qui traite quand même
le contexte de l'utilisateur.
`.trim();

const STRICT_APPENDIX_BY_LANGUAGE: Readonly<Record<SupportedLanguage, string>> =
  {
    en: STRICT_APPENDIX_EN,
    fr: STRICT_APPENDIX_FR,
  };

export function buildStrictSystemPrompt(base: SystemPrompt): string {
  return `${base.text}\n\n${STRICT_APPENDIX_BY_LANGUAGE[base.language]}`;
}
