import Foundation

@MainActor
protocol HomeRepository: AnyObject {
    func loadWeeklyTasks(goalId: String) async throws -> [WeeklyTaskDTO]
    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTaskDTO
    func loadWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO?
    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO
    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRatingDTO]?) async throws -> DebriefDTO
}

@MainActor
final class DefaultHomeRepository: HomeRepository {
    static let shared = DefaultHomeRepository()

    private let roadmap: any RoadmapRepository

    init(roadmap: any RoadmapRepository = SupabaseRoadmapRepository.shared) {
        self.roadmap = roadmap
    }

    func loadWeeklyTasks(goalId: String) async throws -> [WeeklyTaskDTO] {
        try await roadmap.getWeeklyTasks(goalId: goalId)
    }

    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTaskDTO {
        try await roadmap.toggleTask(goalId: goalId, taskId: taskId, isCompleted: isCompleted)
    }

    func loadWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO? {
        try await roadmap.getWeeklyPlan(goalId: goalId)
    }

    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO {
        try await roadmap.generateWeeklyPlan(goalId: goalId)
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRatingDTO]?) async throws -> DebriefDTO {
        try await roadmap.submitDebrief(goalId: goalId, weeklyPlanId: weeklyPlanId, note: note, taskRatings: taskRatings)
    }
}
