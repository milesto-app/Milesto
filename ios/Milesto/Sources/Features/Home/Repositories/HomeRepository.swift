import Foundation

struct HomeSnapshot {
    var goalTitle: String?
    var currentMilestoneTitle: String?
    var weeklyPlan: WeeklyPlanDTO?
    var tasks: [WeeklyTaskDTO]
    var todayDebrief: DebriefDTO?
    var hasSyncError: Bool

    static let empty = HomeSnapshot(
        goalTitle: nil,
        currentMilestoneTitle: nil,
        weeklyPlan: nil,
        tasks: [],
        todayDebrief: nil,
        hasSyncError: false
    )
}

@MainActor
protocol HomeRepository: AnyObject {
    func loadCachedSnapshot(goalId: String) -> HomeSnapshot
    func refreshAll(goalId: String) async -> HomeSnapshot
    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTaskDTO
    func cacheTask(_ task: WeeklyTaskDTO)
    func generateWeeklyPlan(goalId: String) async throws
    func waitForGeneratedTasks(goalId: String) async -> Bool
    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRatingDTO]?) async throws -> DebriefDTO
}
