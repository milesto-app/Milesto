import { buildLanguageBlock } from '../../common/language-prompt.helper.js';
import type { AssembledContext } from '../types/context.types.js';
import type { GoalData } from '../types/roadmap.types.js';

const MIN_MILESTONES = 3;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_DAY =
  MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
const DAYS_PER_MONTH = 30;

export function buildMilestoneSystemPrompt(language: string): string {
  return `You are a coaching AI that creates personalized milestone roadmaps using backward planning.

Your task is to generate milestones working backward from the target deadline to the present.

Rules:
- Produce a minimum of ${String(MIN_MILESTONES)} milestones
- For goals with deadlines over ${String(MIN_MILESTONES)} months, produce 1 milestone per month
- For goals with shorter deadlines, milestones represent sequential phases within the available time
- Each milestone should represent a meaningful phase of progress toward the goal
- Consider the user's effort level, available time, and experience level
- Milestones should be progressive, building on each other
- Use backward planning: start from the final outcome and work backward to determine what must be achieved in each phase

Return a JSON array of objects with these exact fields:
- "title": A concise milestone title
- "description": Detailed description of what this milestone involves
- "expected_outcome": What the user should have achieved by this milestone
- "target_month": The month number (1 = first month, 2 = second month, etc.)
- "order_index": Sequential index starting from 1

Return ONLY the JSON array, no other text.${buildLanguageBlock(language)}`;
}

export function buildMilestoneUserPrompt(
  context: AssembledContext,
  goal: GoalData,
): string {
  const monthsUntilDeadline =
    goal.target_date !== undefined
      ? Math.max(
          1,
          Math.ceil(
            (new Date(goal.target_date).getTime() - Date.now()) /
              (MS_PER_DAY * DAYS_PER_MONTH),
          ),
        )
      : MIN_MILESTONES;

  const milestoneCount = Math.max(MIN_MILESTONES, monthsUntilDeadline);

  const sections: string[] = [];

  if (context.goalProfileSection.length > 0) {
    sections.push(`## Goal Profile\n${context.goalProfileSection}`);
  }
  if (context.intakeSection.length > 0) {
    sections.push(`## Intake Q&A\n${context.intakeSection}`);
  }
  if (context.userProfileSection.length > 0) {
    sections.push(`## User Profile\n${context.userProfileSection}`);
  }

  const constraintSection = buildConstraintSection(goal);
  const isCompressed = monthsUntilDeadline < milestoneCount;

  const requirementsSection = isCompressed
    ? buildCompressedRequirements(milestoneCount, monthsUntilDeadline)
    : `Generate exactly ${String(milestoneCount)} milestones using backward planning from month ${String(monthsUntilDeadline)} to month 1.`;

  return `## Goal
Title: ${goal.title}
Description: ${goal.description}
Deadline: ${goal.target_date ?? 'Not specified'}
Months until deadline: ${String(monthsUntilDeadline)}

## Requirements
${requirementsSection}

${constraintSection}

${sections.join('\n\n')}`;
}

function buildCompressedRequirements(
  milestoneCount: number,
  monthsUntilDeadline: number,
): string {
  if (monthsUntilDeadline === 1) {
    return `This is a short-term goal with only 1 month. Generate exactly ${String(milestoneCount)} milestones as sequential phases within that single month. Each milestone is a progressive phase, not a separate month. Set target_month to 1 for all milestones.`;
  }
  return `This goal has ${String(monthsUntilDeadline)} months but requires ${String(milestoneCount)} milestones. Generate exactly ${String(milestoneCount)} milestones as sequential phases, distributing them across the ${String(monthsUntilDeadline)} available months. Assign target_month values between 1 and ${String(monthsUntilDeadline)}, spreading milestones as evenly as possible across the months.`;
}

function buildConstraintSection(goal: GoalData): string {
  if (goal.profile_data === undefined) {
    return '';
  }

  const pd = goal.profile_data;
  const fieldMap: Array<[string, string]> = [
    ['current_state', 'Current State'],
    ['desired_state', 'Desired State'],
    ['constraints', 'Constraints'],
    ['motivation', 'Motivation'],
    ['domain_context', 'Domain'],
    ['effort_level', 'Effort Level'],
    ['available_time', 'Available Time'],
    ['experience_level', 'Experience Level'],
  ];

  const constraintLines: string[] = [];
  for (const [key, label] of fieldMap) {
    if (pd[key] !== undefined) {
      const value =
        typeof pd[key] === 'string' ? pd[key] : JSON.stringify(pd[key]);
      constraintLines.push(`${label}: ${value}`);
    }
  }

  return constraintLines.length > 0
    ? `## User Constraints\n${constraintLines.join('\n')}`
    : '';
}
