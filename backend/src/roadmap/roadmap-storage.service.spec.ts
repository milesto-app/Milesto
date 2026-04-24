import { RoadmapStorageService } from "./roadmap-storage.service.js";

describe("RoadmapStorageService", () => {
  describe("storeMilestones", () => {
    it("groups weekly steps into four-step months and ignores checkpoint flags", async () => {
      const insert = jest.fn().mockResolvedValue({ error: null });
      const from = jest.fn().mockReturnValue({ insert });
      const service = new RoadmapStorageService({
        getAdminClient: () => ({ from }),
      } as never);

      await service.storeMilestones("goal-123", [
        {
          title: "Step 1",
          description: "Week 1",
          expected_outcome: "Outcome 1",
          is_monthly_checkpoint: true,
          order_index: 1,
        },
        {
          title: "Step 4",
          description: "Week 4",
          expected_outcome: "Outcome 4",
          is_monthly_checkpoint: true,
          order_index: 4,
        },
        {
          title: "Step 5",
          description: "Week 5",
          expected_outcome: "Outcome 5",
          is_monthly_checkpoint: true,
          order_index: 5,
        },
      ]);

      expect(from).toHaveBeenCalledWith("milestones");
      expect(insert).toHaveBeenCalledWith([
        expect.objectContaining({
          target_month: 1,
          target_week: 1,
          is_monthly_checkpoint: false,
          order_index: 1,
        }),
        expect.objectContaining({
          target_month: 1,
          target_week: 4,
          is_monthly_checkpoint: false,
          order_index: 4,
        }),
        expect.objectContaining({
          target_month: 2,
          target_week: 5,
          is_monthly_checkpoint: false,
          order_index: 5,
        }),
      ]);
    });
  });
});
