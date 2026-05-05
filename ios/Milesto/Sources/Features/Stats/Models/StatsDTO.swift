import Foundation

struct StatsDTO: nonisolated SyncableDTO {
    let goalId: String
    let updatedAt: Date
    let streak: StreakStatsDTO
    let completion: CompletionStatsDTO
    let weeklyProgress: [WeeklyProgressDTO]
    let milestones: MilestoneProgressDTO

    var id: String {
        goalId
    }

    init(
        goalId: String,
        updatedAt: Date = Date(),
        streak: StreakStatsDTO,
        completion: CompletionStatsDTO,
        weeklyProgress: [WeeklyProgressDTO],
        milestones: MilestoneProgressDTO
    ) {
        self.goalId = goalId
        self.updatedAt = updatedAt
        self.streak = streak
        self.completion = completion
        self.weeklyProgress = weeklyProgress
        self.milestones = milestones
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        goalId = try container.decodeIfPresent(String.self, forKey: .goalId) ?? ""
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt) ?? .distantPast
        streak = try container.decode(StreakStatsDTO.self, forKey: .streak)
        completion = try container.decode(CompletionStatsDTO.self, forKey: .completion)
        weeklyProgress = try container.decode([WeeklyProgressDTO].self, forKey: .weeklyProgress)
        milestones = try container.decode(MilestoneProgressDTO.self, forKey: .milestones)
    }

    func withSyncMetadata(goalId: String, updatedAt: Date) -> StatsDTO {
        StatsDTO(
            goalId: goalId,
            updatedAt: updatedAt,
            streak: streak,
            completion: completion,
            weeklyProgress: weeklyProgress,
            milestones: milestones
        )
    }

    static func empty(goalId: String, updatedAt: Date = Date()) -> StatsDTO {
        StatsDTO(
            goalId: goalId,
            updatedAt: updatedAt,
            streak: StreakStatsDTO(current: 0, best: 0, last7Days: []),
            completion: CompletionStatsDTO(
                overallRate: 0,
                thisWeekRate: 0,
                totalCompleted: 0,
                totalObjectives: 0
            ),
            weeklyProgress: [],
            milestones: MilestoneProgressDTO(completed: 0, total: 0)
        )
    }
}

struct StreakStatsDTO: nonisolated Codable, Sendable {
    let current: Int
    let best: Int
    let last7Days: [DayActivityDTO]
}

struct DayActivityDTO: nonisolated Codable, Sendable {
    let date: String
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

struct CompletionStatsDTO: nonisolated Codable, Sendable {
    let overallRate: Double
    let thisWeekRate: Double
    let totalCompleted: Int
    let totalObjectives: Int
}

struct WeeklyProgressDTO: nonisolated Codable, Identifiable, Sendable {
    var id: Int {
        weekNumber
    }

    let weekNumber: Int
    let completionRate: Double
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

struct MilestoneProgressDTO: nonisolated Codable, Sendable {
    let completed: Int
    let total: Int
}
