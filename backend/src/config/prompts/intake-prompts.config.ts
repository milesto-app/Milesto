import type { PriorBatchContext } from '../questions.config.js';
import {
  MIN_ANSWER_LENGTH_SHORT,
  MAX_ANSWER_LENGTH_LONG,
} from '../../intake/constants/intake.constants.js';

export { buildIntakeBatchSystemPrompt } from './intake-system-prompt.config.js';
export type { BatchPromptParams } from './intake-system-prompt.config.js';

interface BatchUserPromptParams {
  goalDescription: string;
  priorBatches: PriorBatchContext[];
  batchNumber: number;
  maxBatches: number;
}

export function buildIntakeBatchUserPrompt(params: BatchUserPromptParams): string {
  const { goalDescription, priorBatches, batchNumber, maxBatches } = params;
  const remainingBudget = maxBatches - batchNumber + 1;

  const priorContext = buildPriorContext(priorBatches);
  const timelineContext = buildTimelineContext(priorBatches);

  return `<goal>${goalDescription}</goal>

${timelineContext}${priorContext}Generate batch ${String(batchNumber)} of questions. You have ${String(remainingBudget)} batches remaining (including this one).

Before generating, re-read each prior answer carefully. Identify: (1) PLAN-CRITICAL GAPS — is the current state specific enough to build a week-1 plan from? Is the desired outcome measurable enough to create milestones? If either is still vague, deepen it before anything else, (2) answers with the most EMOTIONAL energy — long, detailed responses where the user revealed something real, (3) answers that feel vague or avoidant — possible resistance worth gently probing, (4) contradictions between answers — gaps between what they say and what they do.

Deepen plan-critical dimensions (current state, desired outcome, constraints) first — these define what the plan IS. Then follow emotional threads — these determine whether the user sticks with it. A batch that only captures emotion without advancing the plan picture is incomplete.`;
}

function buildPriorContext(priorBatches: PriorBatchContext[]): string {
  if (priorBatches.length === 0) {
    return '';
  }

  let context = '<prior_responses>\n';
  for (const batch of priorBatches) {
    context += `--- Batch ${String(batch.batch_number)} ---\n`;
    for (const q of batch.questions) {
      context += formatPriorQuestion(q);
    }
  }
  context += '</prior_responses>\n\n';
  return context;
}

function formatPriorQuestion(q: PriorBatchContext['questions'][number]): string {
  const annotation = getAnnotation(q);
  const optionsLine = getOptionsLine(q);
  return `Q: ${q.question_text} (${q.question_type})${optionsLine}\nA: ${q.answer}${annotation}\n`;
}

function getAnnotation(q: PriorBatchContext['questions'][number]): string {
  if (q.question_type !== 'text' || q.answer === '' || q.answer === '[no answer]') {
    return '';
  }
  if (q.answer.length > MAX_ANSWER_LENGTH_LONG) {
    return ' [LONG ANSWER - high engagement signal]';
  }
  if (q.answer.length < MIN_ANSWER_LENGTH_SHORT) {
    return ' [SHORT ANSWER - possible avoidance signal]';
  }
  return '';
}

function getOptionsLine(q: PriorBatchContext['questions'][number]): string {
  if (q.question_type !== 'single_choice' && q.question_type !== 'multiple_choice') {
    return '';
  }
  if (q.config === null || q.config === undefined) {
    return '';
  }
  const options = (q.config as { options?: string[] }).options;
  if (!Array.isArray(options)) {
    return '';
  }
  return `\nOptions: ${options.join(' / ')}`;
}

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30;
const DATE_STRING_LENGTH = 10;

export function buildTimelineContext(priorBatches: PriorBatchContext[]): string {
  for (const batch of priorBatches) {
    for (const q of batch.questions) {
      const result = tryBuildTimeline(q);
      if (result !== null) {
        return result;
      }
    }
  }
  return '';
}

function tryBuildTimeline(q: PriorBatchContext['questions'][number]): string | null {
  if (q.config?.format !== 'date') {
    return null;
  }

  const targetDate = new Date(`${q.answer}T00:00:00Z`);
  if (isNaN(targetDate.getTime())) {
    return null;
  }

  const today = new Date().toISOString().slice(0, DATE_STRING_LENGTH);
  const todayDate = new Date(`${today}T00:00:00Z`);
  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / MS_PER_DAY);
  const timeRemaining = formatTimeRemaining(diffDays);

  return `<timeline>\nToday's date: ${today}\nTarget deadline: ${q.answer}\nTime remaining: ${timeRemaining}\n</timeline>\n\n`;
}

function formatTimeRemaining(diffDays: number): string {
  if (diffDays < 0) {
    return `Overdue by ${String(Math.abs(diffDays))} days`;
  }
  if (diffDays === 0) {
    return 'Due today';
  }
  if (diffDays < DAYS_PER_MONTH) {
    return `${String(diffDays)} days`;
  }
  const months = Math.round(diffDays / DAYS_PER_MONTH);
  return `~${String(months)} ${months === 1 ? 'month' : 'months'} (${String(diffDays)} days)`;
}
