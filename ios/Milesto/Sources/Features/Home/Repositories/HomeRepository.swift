import Foundation

@MainActor
protocol HomeRepository: AnyObject {
    func loadCachedSnapshot(goalId: String) -> HomeSnapshot
    func refreshAll(goalId: String) async -> HomeSnapshot
    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTask
    func cacheTask(_ task: WeeklyTask)
    func generateWeeklyPlan(goalId: String) async throws
    func waitForGeneratedTasks(goalId: String) async -> Bool
    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRating]?) async throws -> Debrief
}
