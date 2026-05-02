import Foundation

struct RemoteStats: nonisolated Codable {
    let streak: RemoteStreakStats
    let completion: RemoteCompletionStats
    let weeklyProgress: [RemoteWeeklyProgress]
    let milestones: RemoteMilestoneProgress
}

struct RemoteStreakStats: nonisolated Codable {
    let current: Int
    let best: Int
    let last7Days: [RemoteDayActivity]
}

struct RemoteDayActivity: nonisolated Codable {
    let date: String
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

struct RemoteCompletionStats: nonisolated Codable {
    let overallRate: Double
    let thisWeekRate: Double
    let totalCompleted: Int
    let totalObjectives: Int
}

struct RemoteWeeklyProgress: nonisolated Codable, Identifiable {
    var id: Int {
        weekNumber
    }

    let weekNumber: Int
    let completionRate: Double
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

struct RemoteMilestoneProgress: nonisolated Codable {
    let completed: Int
    let total: Int
}
