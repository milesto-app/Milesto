import Foundation

@MainActor
protocol HomeRemoteRepository: AnyObject {
    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlan?
    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlan
    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTask]
    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTask
    func getDebriefHistory(goalId: String) async throws -> [Debrief]
    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRating]?) async throws -> Debrief
}
