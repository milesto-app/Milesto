import type { GoalProfile } from "./intake-prompt.service.js";

export function buildProfileData(
  profile: GoalProfile,
): Record<string, unknown> {
  return {
    current_state: profile.current_state,
    desired_state: profile.desired_state,
    constraints: profile.constraints,
    motivation: profile.motivation,
    domain_context: profile.domain_context,
    ...(profile.goal_specific_insights !== undefined && {
      goal_specific_insights: profile.goal_specific_insights,
    }),
  };
}
