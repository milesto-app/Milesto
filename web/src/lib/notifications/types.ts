export type NotificationTypePreset = {
  kind: string;
  label: string;
  title: string;
  body: string;
};

export const NOTIFICATION_TYPE_PRESETS: readonly NotificationTypePreset[] = [
  {
    kind: "coach_reply_ready",
    label: "Coach reply ready",
    title: "Your coach",
    body: "I've got a thought on what you just shared.",
  },
  {
    kind: "roadmap_generated",
    label: "Roadmap generated",
    title: "Momentum",
    body: "Your roadmap is ready — take a look.",
  },
  {
    kind: "weekly_plan_published",
    label: "Weekly plan published",
    title: "Momentum",
    body: "This week's plan is live.",
  },
  {
    kind: "daily_check_in",
    label: "Daily check-in",
    title: "Your coach",
    body: "Ready for today's plan?",
  },
  {
    kind: "implementation_intention",
    label: "Implementation intention",
    title: "Your coach",
    body: "If it's 8am at your desk, then start the first task.",
  },
  {
    kind: "streak_at_risk",
    label: "Streak at risk",
    title: "Momentum",
    body: "Your streak is close — don't drop it.",
  },
  {
    kind: "streak_broken",
    label: "Streak broken",
    title: "Momentum",
    body: "Let's pick up where you left off.",
  },
  {
    kind: "streak_milestone",
    label: "Streak milestone",
    title: "Momentum",
    body: "Weekly streak extended.",
  },
  {
    kind: "milestone_preview",
    label: "Milestone preview",
    title: "Your coach",
    body: "Next up: your next milestone.",
  },
  {
    kind: "milestone_hit",
    label: "Milestone hit",
    title: "Milestone unlocked!",
    body: "Nicely done — momentum is building.",
  },
  {
    kind: "milestone_countdown",
    label: "Milestone countdown",
    title: "Momentum",
    body: "Your milestone is coming up soon.",
  },
  {
    kind: "goal_hit",
    label: "Goal hit",
    title: "Goal complete!",
    body: "You crossed the finish line. Take it in.",
  },
  {
    kind: "goal_deadline_countdown",
    label: "Goal deadline countdown",
    title: "Momentum",
    body: "Your goal deadline is approaching.",
  },
  {
    kind: "week_completed",
    label: "Week completed",
    title: "Week wrapped up",
    body: "Another one in the bag — keep the streak going.",
  },
  {
    kind: "week_completion_gap",
    label: "Week completion gap",
    title: "Momentum",
    body: "A few tasks are still open this week.",
  },
  {
    kind: "weekly_debrief_prompt",
    label: "Weekly debrief prompt",
    title: "Your coach",
    body: "Let's debrief this week together.",
  },
  {
    kind: "coach_proactive",
    label: "Coach proactive",
    title: "Your coach",
    body: "I've been thinking about your goal.",
  },
  {
    kind: "plan_not_generated",
    label: "Plan not generated",
    title: "Momentum",
    body: "We couldn't build your plan — let's try again.",
  },
  {
    kind: "winback_step",
    label: "Winback step",
    title: "Momentum",
    body: "Your goal is still waiting for you.",
  },
  {
    kind: "unexpected_win",
    label: "Unexpected win",
    title: "Momentum",
    body: "Nice — that counts as a win.",
  },
  {
    kind: "stale_tasks",
    label: "Stale tasks",
    title: "Momentum",
    body: "A few tasks have been sitting untouched.",
  },
];
