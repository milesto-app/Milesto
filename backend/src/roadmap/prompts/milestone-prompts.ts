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
const DAYS_PER_WEEK = 7;
const WEEKS_PER_MONTH_GROUP = 3;

export function buildMilestoneSystemPrompt(language: string): string {
  return `You are a coaching AI that creates personalized weekly milestone roadmaps using backward planning.

Your task is to generate weekly milestones grouped by month, working backward from the target deadline to the present.

Rules:
- Produce a minimum of ${String(MIN_MILESTONES)} milestones (one per week)
- Group milestones into months of ~${String(WEEKS_PER_MONTH_GROUP)} weeks each
- The last milestone in each month group must have is_monthly_checkpoint set to true
- Each milestone represents one week of focused work toward the goal
- Consider the user's effort level, available time, and experience level
- Milestones should be progressive, building on each other
- Use backward planning: start from the final outcome and work backward to determine what must be achieved each week

Return a JSON array of objects with these exact fields:
- "title": A concise milestone title (no prefixes like "Month X Milestone:" — just the topic)
- "description": Detailed description of what this milestone involves
- "expected_outcome": What the user should have achieved by this milestone
- "target_month": The month number this week belongs to (1 = first month, 2 = second month, etc.)
- "target_week": The overall week number (1, 2, 3, ...)
- "is_monthly_checkpoint": true if this is the last milestone in its month group, false otherwise
- "order_index": Sequential index starting from 1 (same as target_week)

Return ONLY the JSON array, no other text.${buildLanguageBlock(language)}`;
}

export function buildMilestoneUserPrompt(
  context: AssembledContext,
  goal: GoalData,
): string {
  const weeksUntilDeadline =
    goal.target_date !== undefined
      ? Math.max(
          1,
          Math.ceil(
            (new Date(goal.target_date).getTime() - Date.now()) /
              (MS_PER_DAY * DAYS_PER_WEEK),
          ),
        )
      : MIN_MILESTONES;

  const milestoneCount = Math.max(MIN_MILESTONES, weeksUntilDeadline);
  const monthCount = Math.max(
    1,
    Math.ceil(milestoneCount / WEEKS_PER_MONTH_GROUP),
  );

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

  const requirementsSection = `Generate exactly ${String(milestoneCount)} weekly milestones grouped into ${String(monthCount)} months (~${String(WEEKS_PER_MONTH_GROUP)} weeks per month). Use backward planning from week ${String(milestoneCount)} to week 1. The last milestone in each month group must have is_monthly_checkpoint: true.`;

  return `## Goal
Title: ${goal.title}
Description: ${goal.description}
Deadline: ${goal.target_date ?? 'Not specified'}
Weeks until deadline: ${String(weeksUntilDeadline)}
Total months: ${String(monthCount)}

## Requirements
${requirementsSection}

${constraintSection}

${sections.join('\n\n')}`;
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
