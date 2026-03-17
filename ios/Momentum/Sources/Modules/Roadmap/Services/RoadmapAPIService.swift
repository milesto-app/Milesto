import Foundation
import Supabase

final class RoadmapAPIService {
    static let shared = RoadmapAPIService()

    private init() {}

    func generateRoadmap(goalId: String) async throws -> RoadmapDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/generate"
        )
    }

    func getRoadmap(goalId: String) async throws -> RoadmapDTO {
        struct RoadmapResponse: Decodable {
            let id: String
            let goalId: String
            let userId: String
            let status: RoadmapStatus
            let generationAttempts: Int
            let createdAt: String
            let updatedAt: String
            let milestones: [MilestoneDTO]?

            enum CodingKeys: String, CodingKey {
                case id, status, milestones
                case goalId = "goal_id"
                case userId = "user_id"
                case generationAttempts = "generation_attempts"
                case createdAt = "created_at"
                case updatedAt = "updated_at"
            }
        }

        struct ActiveWeeklyPlan: Decodable {
            let milestoneId: String

            enum CodingKeys: String, CodingKey {
                case milestoneId = "milestone_id"
            }
        }

        let roadmap: RoadmapResponse = try await Supabase.client
            .from("roadmaps")
            .select("*, milestones(*)")
            .eq("goal_id", value: goalId)
            .single()
            .execute()
            .value

        var currentMilestoneId: String?
        if let activePlan: ActiveWeeklyPlan = try? await Supabase.client
            .from("weekly_plans")
            .select("milestone_id")
            .eq("goal_id", value: goalId)
            .eq("status", value: "active")
            .single()
            .execute()
            .value
        {
            currentMilestoneId = activePlan.milestoneId
        }

        return RoadmapDTO(
            id: roadmap.id,
            goalId: roadmap.goalId,
            userId: roadmap.userId,
            status: roadmap.status,
            generationAttempts: roadmap.generationAttempts,
            createdAt: roadmap.createdAt,
            updatedAt: roadmap.updatedAt,
            milestones: roadmap.milestones,
            currentMilestoneId: currentMilestoneId
        )
    }

    func getMilestones(goalId: String) async throws -> [MilestoneSummaryDTO] {
        try await Supabase.client
            .from("milestones")
            .select("id, title, description, expected_outcome, target_month, target_week, is_monthly_checkpoint, order_index")
            .eq("goal_id", value: goalId)
            .order("order_index")
            .execute()
            .value
    }

    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO? {
        do {
            return try await Supabase.client
                .from("weekly_plans")
                .select()
                .eq("goal_id", value: goalId)
                .eq("status", value: "active")
                .single()
                .execute()
                .value
        } catch let error as PostgrestError where error.code == "PGRST116" {
            return nil
        }
    }

    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/weekly-plan/generate"
        )
    }

    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTaskDTO] {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/weekly-tasks"
        )
    }

    func toggleTask(taskId: String, isCompleted: Bool) async throws -> WeeklyTaskDTO {
        try await Supabase.client
            .from("weekly_tasks")
            .update(UpdateTaskRequest(isCompleted: isCompleted))
            .eq("id", value: taskId)
            .select()
            .single()
            .execute()
            .value
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRatingDTO]?) async throws -> DebriefDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/debrief",
            body: SubmitDebriefRequest(weeklyPlanId: weeklyPlanId, note: note, taskRatings: taskRatings)
        )
    }

    func getTasksForMilestone(milestoneId: String) async throws -> [WeeklyTaskDTO] {
        struct PlanRef: Decodable { let id: String }
        let plans: [PlanRef] = try await Supabase.client
            .from("weekly_plans")
            .select("id")
            .eq("milestone_id", value: milestoneId)
            .execute()
            .value

        guard !plans.isEmpty else { return [] }

        return try await Supabase.client
            .from("weekly_tasks")
            .select()
            .in("weekly_plan_id", values: plans.map(\.id))
            .order("order_index")
            .execute()
            .value
    }

    func getDebriefHistory(goalId: String) async throws -> [DebriefDTO] {
        try await Supabase.client
            .from("debriefs")
            .select()
            .eq("goal_id", value: goalId)
            .order("date", ascending: false)
            .execute()
            .value
    }
}
