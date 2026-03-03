import type { GeneratedQuestion } from './questions.config.js';

// ── French fallback pools (used when AI generation fails validation) ──

export const FALLBACK_POOLS_FR: GeneratedQuestion[][] = [
  // Pool 0: Ressources + mécanisme d'échec + habitudes quotidiennes
  [
    {
      question_text: "Qu'est-ce que tu as déjà de ton côté qui pourrait t'aider ?",
      question_type: 'multiple_choice',
      config: {
        options: [
          'Des connaissances ou compétences dans ce domaine',
          'À des outils, équipements ou un bon environnement',
          'Un emploi du temps flexible que je peux réorganiser',
          "Des personnes autour de moi qui pourraient m'aider ou me rejoindre",
          'Des ressources financières à investir',
          "Une forte motivation — j'ai juste besoin d'un chemin clair",
          'Honnêtement, pas grand-chose — je pars de zéro',
        ],
      },
      order_in_batch: 1,
    },
    {
      question_text:
        "Quand tu as essayé quelque chose de similaire avant, qu'est-ce qui t'a généralement bloqué ?",
      question_type: 'single_choice',
      config: {
        options: [
          "La vie s'est accélérée et c'est passé au second plan",
          "L'approche semblait trop rigide ou compliquée",
          "J'ai perdu ma motivation après l'enthousiasme initial",
          "Je n'avais pas le bon soutien ou la bonne responsabilisation",
          "C'est en fait ma première vraie tentative",
        ],
      },
      order_in_batch: 2,
    },
    {
      question_text:
        'Décris-moi à quoi ressemble une journée de semaine typique pour toi — du matin au soir ?',
      question_type: 'text',
      config: null,
      order_in_batch: 3,
    },
  ],
  // Pool 1: Identité + signal d'engagement
  [
    {
      question_text:
        "Quand tu t'imagines dans un an avec de vrais progrès — c'est plus lié à ce que tu pourras faire, ou à qui tu seras devenu ?",
      question_type: 'single_choice',
      config: {
        options: [
          "C'est une compétence ou capacité spécifique que je veux acquérir",
          "C'est changer la façon dont je me vois",
          "C'est prouver quelque chose à moi-même ou aux autres",
          "C'est ouvrir la porte à quelque chose de plus grand",
          'Honnêtement, un mélange de tout ça',
        ],
      },
      order_in_batch: 1,
    },
    {
      question_text:
        'Pour progresser vraiment, quelle est la chose que tu devrais réduire ou abandonner ?',
      question_type: 'single_choice',
      config: {
        options: [
          "Le temps d'écran et les réseaux sociaux",
          'Les engagements sociaux ou les sorties',
          'Le sommeil — me lever plus tôt ou me coucher plus tard',
          'Les dépenses non essentielles',
          'Le confort et la routine — je devrais faire des choses inconfortables',
          'Je ne suis honnêtement pas encore sûr',
        ],
      },
      order_in_batch: 2,
    },
  ],
  // Pool 2: Système de soutien + gestion du stress + résilience
  [
    {
      question_text:
        'À quel point ton entourage proche (partenaire, famille, amis proches) soutient-il cet objectif ?',
      question_type: 'scale',
      config: {
        min: 1,
        max: 5,
        min_label: 'Ils ne sont pas au courant',
        max_label: 'Ils sont pleinement impliqués',
      },
      order_in_batch: 1,
    },
    {
      question_text:
        'Quand tu es stressé ou que tu passes une mauvaise journée, quel est ton réflexe ?',
      question_type: 'single_choice',
      config: {
        options: [
          'Manger ou boire quelque chose de réconfortant',
          'Scroller mon téléphone ou me perdre devant un écran',
          "Me retirer et m'isoler",
          "En parler à quelqu'un",
          'Faire du sport ou bouger',
          'Tenir bon et ignorer',
        ],
      },
      order_in_batch: 2,
    },
    {
      question_text:
        "Si tu subissais un revers et décrochais pendant quelques jours — ça arrive à tout le monde — qu'est-ce qui te ressemble le plus ?",
      question_type: 'single_choice',
      config: {
        options: [
          "J'abandonnerais probablement et réessaierais plus tard",
          'Je me sentirais coupable mais me forcerais à reprendre',
          'Je passerais à autre chose et continuerais',
          'Je le prendrais comme un signe que mon approche doit changer',
        ],
      },
      order_in_batch: 3,
    },
  ],
];
