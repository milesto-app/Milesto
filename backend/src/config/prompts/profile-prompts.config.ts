import type { PriorBatchContext } from '../questions.config.js';
import { buildTimelineContext } from './intake-prompts.config.js';
import { buildLanguageBlock } from '../../common/language-prompt.helper.js';

const PROFILE_BASE_PROMPT = `You are a coaching profile synthesizer. Your job is to analyze all intake responses and create a comprehensive, structured coaching profile.

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "current_state": "A detailed assessment of the user's current situation, resources, skills, and starting point relevant to their goal.",
  "desired_state": "A clear description of what success looks like — the end state the user wants to reach.",
  "constraints": "Time, financial, physical, or situational constraints that limit the user's options or pace.",
  "motivation": "What drives the user — their why, their emotional connection to this goal, and what keeps them going.",
  "domain_context": "Relevant domain knowledge — the specific field, area, or discipline of their goal and what matters in it.",
  "narrative_summary": "A 2-3 paragraph narrative that weaves together the above sections into a coherent coaching profile. Written in second person ('you') as if speaking to the user.",
  "goal_specific_insights": { "key": "value" }
}

RULES:
- The 6 base fields (current_state, desired_state, constraints, motivation, domain_context, narrative_summary) are REQUIRED and MUST be non-empty strings.
- Draw from ALL intake responses — do not ignore any answers.
- Be specific and concrete — reference actual details from the user's responses.
- The narrative_summary should feel personal and insightful, not generic.
- Do NOT include any information not supported by the intake responses.
- Each structured section (current_state, desired_state, constraints, motivation, domain_context) should be 2-5 sentences.
- goal_specific_insights is OPTIONAL. Include it only when the intake reveals 2-5 domain-specific patterns that don't fit neatly into the 5 base fields. Examples: "dietary_patterns", "skill_gaps", "relationship_dynamics", "financial_habits", "sleep_patterns". Each key should be a snake_case descriptor and each value a concise insight string.`;

export function buildProfileSystemPrompt(language: string): string {
  return PROFILE_BASE_PROMPT + buildLanguageBlock(language);
}

interface ProfileUserPromptParams {
  goalDescription: string;
  priorBatches: PriorBatchContext[];
}

export function buildProfileUserPrompt(params: ProfileUserPromptParams): string {
  const { goalDescription, priorBatches } = params;

  let priorContext = '';
  for (const batch of priorBatches) {
    priorContext += `--- Batch ${String(batch.batch_number)} ---\n`;
    for (const q of batch.questions) {
      priorContext += `Q: ${q.question_text} (${q.question_type})\nA: ${q.answer}\n`;
    }
  }

  const timelineContext = buildTimelineContext(priorBatches);

  return `GOAL: ${goalDescription}

${timelineContext}COMPLETE INTAKE RESPONSES:
${priorContext}
Synthesize all the above into a comprehensive coaching profile.`;
}
