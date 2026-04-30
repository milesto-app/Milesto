import Foundation

@MainActor
protocol RoadmapRepository: AnyObject {
    func generateRoadmap(goalId: String) async throws -> RoadmapDTO
    func getRoadmap(goalId: String) async throws -> RoadmapDTO
    func getMilestones(goalId: String) async throws -> [MilestoneSummaryDTO]
    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO?
    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO
    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTaskDTO]
    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTaskDTO
    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRatingDTO]?) async throws -> DebriefDTO
    func getTasksForMilestone(milestoneId: String) async throws -> [WeeklyTaskDTO]
    func getDebriefHistory(goalId: String) async throws -> [DebriefDTO]
}
