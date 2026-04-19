export const ROADMAP_STATUS = {
  GENERATING: "generating",
  COMPLETE: "complete",
  FAILED: "failed",
} as const;

export type RoadmapStatusValue =
  (typeof ROADMAP_STATUS)[keyof typeof ROADMAP_STATUS];
