import Foundation

struct GoalSummary: Identifiable, Hashable {
    let id: String
    let title: String
    let status: String
}

struct CachedRoadmap {
    var goalTitle: String?
    var switchableGoals: [GoalSummary]
    var currentMilestoneId: String?
    var milestones: [MilestoneRecord]
}

struct MilestoneRecord: Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let expectedOutcome: String
    let targetMonth: Int
    let targetWeek: Int
    let isMonthlyCheckpoint: Bool
    let orderIndex: Int
}

@MainActor
protocol RoadmapFeatureRepository: AnyObject {
    func loadCachedRoadmap(goalId: String) -> CachedRoadmap
    func refreshRoadmap(goalId: String) async -> CachedRoadmap
    func currentTaskProgress(goalId: String) -> Double
    func tasksForMilestone(milestoneId: String) async throws -> [WeeklyTask]
    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTask
    func cacheTask(_ task: WeeklyTask)
    func generateRoadmap(goalId: String) async throws
    func fetchRoadmapStatus(goalId: String) async throws -> RoadmapStatus
}
