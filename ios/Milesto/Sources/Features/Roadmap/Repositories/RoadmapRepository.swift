import Foundation

@MainActor
protocol RemoteRoadmapRepository: AnyObject {
    func generateRoadmap(goalId: String) async throws -> RemoteRoadmap
    func getRoadmap(goalId: String) async throws -> RemoteRoadmap
    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlan?
    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlan
    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTask]
    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTask
    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRating]?) async throws -> Debrief
    func getTasksForMilestone(milestoneId: String) async throws -> [WeeklyTask]
    func getDebriefHistory(goalId: String) async throws -> [Debrief]
}
