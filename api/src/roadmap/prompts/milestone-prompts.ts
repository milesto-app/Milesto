import { buildLanguageBlock } from "../../common/language-prompt.helper.js";
import type { AssembledContext } from "../types/context.types.js";
import type { GoalData } from "../types/roadmap.types.js";

const MIN_MILESTONES = 3;
const MAX_MILESTONES = 52;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_DAY =
  MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
const DAYS_PER_WEEK = 7;
const WEEKS_PER_MONTH_GROUP = 4;

export function buildMilestoneSystemPrompt(language: string): string {
  return `You are a coaching AI that creates personalized weekly milestone roadmaps.

Your task is to generate weekly milestones grouped by month, progressing chronologically from the user's current state toward the goal.

Rules:
- Produce a minimum of ${String(MIN_MILESTONES)} milestones (one per week)
- Group milestones into months of ${String(WEEKS_PER_MONTH_GROUP)} weekly steps each
- Each milestone represents one week of focused work toward the goal
- Consider the user's effort level, available time, and experience level
- Milestones should be progressive, building on each other
- Treat every milestone as a peer weekly step; do not create destination, capstone, summary, or otherwise specially labeled milestones

Return a JSON array of objects with these exact fields:
- "title": A concise milestone title (no prefixes like "Month X Milestone:" — just the topic)
- "description": Detailed description of what this milestone involves
- "expected_outcome": What the user should have achieved by this milestone
- "order_index": Sequential index starting from 1

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

  const milestoneCount = Math.min(
    MAX_MILESTONES,
    Math.max(MIN_MILESTONES, weeksUntilDeadline),
  );
  const isCapped = weeksUntilDeadline > MAX_MILESTONES;
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

  const demographicsSection = buildDemographicsSection(goal);
  const constraintSection = buildConstraintSection(goal);

  const cappedNote = isCapped
    ? ` The goal's full deadline is ${String(weeksUntilDeadline)} weeks away, but plan only the first ${String(milestoneCount)} weeks; the coach will extend the roadmap later.`
    : "";
  const requirementsSection = `Generate exactly ${String(milestoneCount)} weekly milestones grouped into ${String(monthCount)} months (${String(WEEKS_PER_MONTH_GROUP)} weekly steps per month where possible). Arrange milestones chronologically from week 1 to week ${String(milestoneCount)}. Do not create monthly summary, checkpoint, destination, capstone, or otherwise specially labeled milestones; every milestone should be a peer weekly step.${cappedNote}`;

  return `## Goal
Title: ${goal.title}
Description: ${goal.description}
Deadline: ${goal.target_date ?? "Not specified"}
Weeks until deadline: ${String(weeksUntilDeadline)}
Total months: ${String(monthCount)}

## Requirements
${requirementsSection}

${demographicsSection}

${constraintSection}

${sections.join("\n\n")}`;
}

function buildDemographicsSection(goal: GoalData): string {
  if (goal.user_birth_year === undefined) {
    return "";
  }
  const age = new Date().getFullYear() - goal.user_birth_year;
  return `## User Demographics\nApproximate age: ${String(age)} years old. Adapt tone, examples, and references to this life stage.`;
}

function buildConstraintSection(goal: GoalData): string {
  if (goal.profile_data === undefined) {
    return "";
  }

  const pd = goal.profile_data;
  const fieldMap: Array<[string, string]> = [
    ["current_state", "Current State"],
    ["desired_state", "Desired State"],
    ["constraints", "Constraints"],
    ["motivation", "Motivation"],
    ["domain_context", "Domain"],
    ["effort_level", "Effort Level"],
    ["available_time", "Available Time"],
    ["experience_level", "Experience Level"],
  ];

  const constraintLines: string[] = [];
  for (const [key, label] of fieldMap) {
    if (pd[key] !== undefined) {
      const value =
        typeof pd[key] === "string" ? pd[key] : JSON.stringify(pd[key]);
      constraintLines.push(`${label}: ${value}`);
    }
  }

  return constraintLines.length > 0
    ? `## User Constraints\n${constraintLines.join("\n")}`
    : "";
}
