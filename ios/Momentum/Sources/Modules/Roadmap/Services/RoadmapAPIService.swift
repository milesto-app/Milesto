import Foundation
import Supabase

enum CheckInError: LocalizedError {
    case roadmapNotActive

    var errorDescription: String? {
        switch self {
        case .roadmapNotActive:
            String(localized: "home.checkin.error.roadmapNotActive", table: "Home")
        }
    }
}

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
            .select("id, title, description, expected_outcome, target_month, order_index")
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

    func submitCheckIn(goalId: String, energyLevel: EnergyLevel, note: String?) async throws -> CheckInDTO {
        let roadmap: RoadmapDTO = try await getRoadmap(goalId: goalId)
        guard roadmap.status == .complete else {
            throw CheckInError.roadmapNotActive
        }

        struct InsertBody: Encodable {
            let goalId: String
            let userId: String
            let date: String
            let energyLevel: EnergyLevel
            let note: String?

            enum CodingKeys: String, CodingKey {
                case date, note
                case goalId = "goal_id"
                case userId = "user_id"
                case energyLevel = "energy_level"
            }
        }

        let userId = try await Supabase.client.auth.session.user.id
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        let body = InsertBody(
            goalId: goalId,
            userId: userId.uuidString,
            date: formatter.string(from: Date()),
            energyLevel: energyLevel,
            note: note
        )

        return try await Supabase.client
            .from("check_ins")
            .insert(body)
            .select()
            .single()
            .execute()
            .value
    }

    func getCheckInHistory(goalId: String) async throws -> [CheckInDTO] {
        try await Supabase.client
            .from("check_ins")
            .select()
            .eq("goal_id", value: goalId)
            .order("date", ascending: false)
            .execute()
            .value
    }

    func getDailyObjectives(goalId: String) async throws -> [DailyObjectiveDTO] {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/daily-objectives"
        )
    }

    func toggleObjective(goalId _: String, objectiveId: String, isCompleted: Bool) async throws -> DailyObjectiveDTO {
        try await Supabase.client
            .from("daily_objectives")
            .update(UpdateObjectiveRequest(isCompleted: isCompleted))
            .eq("id", value: objectiveId)
            .select()
            .single()
            .execute()
            .value
    }

    func submitDebrief(goalId: String, note: String, taskRatings: [TaskRatingDTO]?) async throws -> DebriefDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/debrief",
            body: SubmitDebriefRequest(note: note, taskRatings: taskRatings)
        )
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
