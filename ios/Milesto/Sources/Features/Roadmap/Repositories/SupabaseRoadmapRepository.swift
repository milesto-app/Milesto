import Foundation
import Supabase

@MainActor
final class SupabaseRoadmapRepository: RemoteRoadmapRepository {
    init() {}

    func generateRoadmap(goalId: String) async throws -> RemoteRoadmap {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/generate"
        )
    }

    func getRoadmap(goalId: String) async throws -> RemoteRoadmap {
        struct GoalRoadmapRow: Decodable {
            let id: String
            let userId: String
            let roadmapStatus: RoadmapStatus?
            let roadmapGenerationAttempts: Int
            let roadmapCreatedAt: String?
            let roadmapUpdatedAt: String?
            let milestones: [RemoteMilestone]?

            enum CodingKeys: String, CodingKey {
                case id, milestones
                case userId = "user_id"
                case roadmapStatus = "roadmap_status"
                case roadmapGenerationAttempts = "roadmap_generation_attempts"
                case roadmapCreatedAt = "roadmap_created_at"
                case roadmapUpdatedAt = "roadmap_updated_at"
            }
        }

        struct ActiveWeeklyPlan: Decodable {
            let milestoneId: String

            enum CodingKeys: String, CodingKey {
                case milestoneId = "milestone_id"
            }
        }

        let row: GoalRoadmapRow = try await SupabaseConfig.client
            .from("goals")
            .select("id, user_id, roadmap_status, roadmap_generation_attempts, roadmap_created_at, roadmap_updated_at, milestones (*)")
            .eq("id", value: goalId)
            .single()
            .execute()
            .value

        var currentMilestoneId: String?
        if let activePlan: ActiveWeeklyPlan = try? await SupabaseConfig.client
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

        return RemoteRoadmap(
            goalId: row.id,
            userId: row.userId,
            status: row.roadmapStatus ?? .generating,
            generationAttempts: row.roadmapGenerationAttempts,
            createdAt: row.roadmapCreatedAt ?? "",
            updatedAt: row.roadmapUpdatedAt ?? "",
            milestones: row.milestones,
            currentMilestoneId: currentMilestoneId
        )
    }

    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlan? {
        do {
            return try await SupabaseConfig.client
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

    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlan {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/weekly-plan/generate"
        )
    }

    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTask] {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/weekly-tasks"
        )
    }

    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTask {
        return try await BackendClient.shared.request(
            method: "PATCH",
            path: "goals/\(goalId)/weekly-tasks/\(taskId)",
            body: UpdateTaskRequest(isCompleted: isCompleted)
        )
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRating]?) async throws -> Debrief {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/debrief",
            body: SubmitDebriefRequest(weeklyPlanId: weeklyPlanId, note: note, taskRatings: taskRatings)
        )
    }

    func getTasksForMilestone(milestoneId: String) async throws -> [WeeklyTask] {
        struct PlanRef: Decodable { let id: String }
        let plans: [PlanRef] = try await SupabaseConfig.client
            .from("weekly_plans")
            .select("id")
            .eq("milestone_id", value: milestoneId)
            .execute()
            .value

        guard !plans.isEmpty else { return [] }

        return try await SupabaseConfig.client
            .from("weekly_tasks")
            .select()
            .in("weekly_plan_id", values: plans.map(\.id))
            .order("order_index")
            .execute()
            .value
    }

    func getDebriefHistory(goalId: String) async throws -> [Debrief] {
        try await SupabaseConfig.client
            .from("debriefs")
            .select()
            .eq("goal_id", value: goalId)
            .order("date", ascending: false)
            .execute()
            .value
    }
}
