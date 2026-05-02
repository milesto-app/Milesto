import Foundation

struct StatsDTO: nonisolated Codable {
    let streak: StreakStatsDTO
    let completion: CompletionStatsDTO
    let weeklyProgress: [WeeklyProgressDTO]
    let milestones: MilestoneProgressDTO
}

struct StreakStatsDTO: nonisolated Codable {
    let current: Int
    let best: Int
    let last7Days: [DayActivityDTO]
}

struct DayActivityDTO: nonisolated Codable {
    let date: String
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

struct CompletionStatsDTO: nonisolated Codable {
    let overallRate: Double
    let thisWeekRate: Double
    let totalCompleted: Int
    let totalObjectives: Int
}

struct WeeklyProgressDTO: nonisolated Codable, Identifiable {
    var id: Int {
        weekNumber
    }

    let weekNumber: Int
    let completionRate: Double
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

struct MilestoneProgressDTO: nonisolated Codable {
    let completed: Int
    let total: Int
}
