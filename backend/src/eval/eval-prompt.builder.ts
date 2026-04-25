import type { EvalPriorBatch, EvalQuestion } from "./eval.types.js";
import type { GoldStandard, GoldStandardQuestion } from "./gold-standards.js";

export interface JudgePromptInput {
  goalDescription: string;
  questions: EvalQuestion[];
  goldStandard: GoldStandard | null;
  priorBatches: EvalPriorBatch[] | null;
}

export interface SimulationPromptInput {
  goalDescription: string;
  priorBatches: EvalPriorBatch[];
  questions: EvalQuestion[];
  batchNumber: number;
}

interface ScaleConfig {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

function readOptions(config: unknown): string[] | undefined {
  if (typeof config !== "object" || config === null) {
    return undefined;
  }
  const opts = (config as Record<string, unknown>).options;
  if (
    !Array.isArray(opts) ||
    !opts.every((o): o is string => typeof o === "string")
  ) {
    return undefined;
  }
  return opts;
}

function readScaleConfig(config: unknown): ScaleConfig | undefined {
  if (typeof config !== "object" || config === null) {
    return undefined;
  }
  const rec = config as Record<string, unknown>;
  if (typeof rec.min !== "number" || typeof rec.max !== "number") {
    return undefined;
  }
  return {
    min: rec.min,
    max: rec.max,
    minLabel: typeof rec.min_label === "string" ? rec.min_label : "",
    maxLabel: typeof rec.max_label === "string" ? rec.max_label : "",
  };
}

export function formatQuestions(questions: EvalQuestion[]): string {
  return questions
    .map((q, i) => {
      const opts = readOptions(q.config);
      const optionsSuffix =
        opts !== undefined ? `\n   Options: ${opts.join(" / ")}` : "";
      return `${i + 1}. [${q.question_type}] ${q.question_text}${optionsSuffix}`;
    })
    .join("\n");
}

export function formatPriorContext(
  priorBatches: EvalPriorBatch[] | null,
): string {
  if (priorBatches === null || priorBatches.length === 0) {
    return "None — this is the first batch.";
  }
  return priorBatches
    .map(
      (batch) =>
        `--- Batch ${batch.batch_number} ---\n${batch.questions
          .map(
            (q) => `Q: ${q.question_text} (${q.question_type})\nA: ${q.answer}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");
}

export function formatGoldStandardQuestions(
  questions: GoldStandardQuestion[],
): string {
  return questions
    .map((q, i) => {
      const opts = readOptions(q.config);
      const optionsSuffix =
        opts !== undefined ? `\n   Options: ${opts.join(" / ")}` : "";
      return `${i + 1}. [${q.question_type}] ${q.question_text}${optionsSuffix}\n   Rationale: ${q.rationale}`;
    })
    .join("\n");
}

export function formatQuestionsWithScale(questions: EvalQuestion[]): string {
  return questions
    .map((q, i) => {
      let line = `${i + 1}. [${q.question_type}] ${q.question_text}`;
      const opts = readOptions(q.config);
      if (opts !== undefined) {
        line += `\n   Options: ${opts.join(" / ")}`;
      }
      const scale = readScaleConfig(q.config);
      if (q.question_type === "scale" && scale !== undefined) {
        line += `\n   Scale: ${String(scale.min)} (${scale.minLabel}) to ${String(scale.max)} (${scale.maxLabel})`;
      }
      return line;
    })
    .join("\n");
}

export function buildGoldSection(goldStandard: GoldStandard | null): string {
  if (goldStandard === null) {
    return "";
  }
  return `\n\n## Gold Standard Reference (what an ideal batch looks like for this domain)\n${formatGoldStandardQuestions(goldStandard.questions)}\n\nScore the "Batch Under Evaluation" against the criteria in your system prompt. Use the Gold Standard as a reference for what excellence looks like in this domain, but score the batch on its own merits.`;
}

export function buildJudgeUserPrompt(input: JudgePromptInput): string {
  const questionsFormatted = formatQuestions(input.questions);
  const priorContext = formatPriorContext(input.priorBatches);
  const goldSection = buildGoldSection(input.goldStandard);

  return `## Goal\n${input.goalDescription}\n\n## Batch Under Evaluation\n${questionsFormatted}\n\n## Prior Batch Context\n${priorContext}${goldSection}`;
}

export function buildSimulationSystemPrompt(): string {
  return `You are role-playing as a real user going through a coaching intake. Stay in character as someone who has the goal described below. Be consistent with the answers you gave in prior batches.

RULES:
- For "text" questions: Answer in 1-3 sentences. Be specific and personal, include some imperfection or vulnerability.
- For "scale" questions: Answer with a single integer within the scale range.
- For "single_choice" questions: Answer with the EXACT text of one option.
- For "multiple_choice" questions: Answer with a comma-separated list of EXACT option texts.
- Stay consistent with your prior answers — do not contradict yourself.
- Be realistic, not aspirational. Real people have doubts, constraints, and messy lives.

Respond with ONLY a JSON array:
[{ "question_index": 1, "answer": "..." }, ...]`;
}

export function buildSimulationUserPrompt(
  input: SimulationPromptInput,
): string {
  const priorContext = formatPriorContext(input.priorBatches);
  const questionsFormatted = formatQuestionsWithScale(input.questions);

  return `GOAL: ${input.goalDescription}\n\nPRIOR ANSWERS:\n${priorContext}\n\nCURRENT BATCH (Batch ${input.batchNumber}) — Answer these questions in character:\n${questionsFormatted}`;
}
