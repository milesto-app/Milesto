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

    enum CodingKeys: String, CodingKey {
        case streak, completion, milestones
        case goalId = "goal_id"
        case updatedAt = "updated_at"
        case weeklyProgress = "weekly_progress"
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

        if let updatedAtString = try container.decodeIfPresent(String.self, forKey: .updatedAt) {
            let withFraction = ISO8601DateFormatter()
            withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            updatedAt = withFraction.date(from: updatedAtString)
                ?? ISO8601DateFormatter().date(from: updatedAtString)
                ?? .distantPast
        } else {
            updatedAt = .distantPast
        }

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

    enum CodingKeys: String, CodingKey {
        case current, best
        case last7Days = "last_7_days"
    }
}

struct DayActivityDTO: nonisolated Codable, Sendable {
    let date: String
    let objectivesCompleted: Int
    let objectivesTotal: Int

    enum CodingKeys: String, CodingKey {
        case date
        case objectivesCompleted = "objectives_completed"
        case objectivesTotal = "objectives_total"
    }
}

struct CompletionStatsDTO: nonisolated Codable, Sendable {
    let overallRate: Double
    let thisWeekRate: Double
    let totalCompleted: Int
    let totalObjectives: Int

    enum CodingKeys: String, CodingKey {
        case overallRate = "overall_rate"
        case thisWeekRate = "this_week_rate"
        case totalCompleted = "total_completed"
        case totalObjectives = "total_objectives"
    }
}

struct WeeklyProgressDTO: nonisolated Codable, Identifiable, Sendable {
    var id: Int {
        weekNumber
    }

    let weekNumber: Int
    let completionRate: Double
    let objectivesCompleted: Int
    let objectivesTotal: Int

    enum CodingKeys: String, CodingKey {
        case weekNumber = "week_number"
        case completionRate = "completion_rate"
        case objectivesCompleted = "objectives_completed"
        case objectivesTotal = "objectives_total"
    }
}

struct MilestoneProgressDTO: nonisolated Codable, Sendable {
    let completed: Int
    let total: Int
}
