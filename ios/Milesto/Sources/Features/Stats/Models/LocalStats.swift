import Foundation
import SwiftData

@Model
final class LocalStats {
    @Attribute(.unique) var goalId: String
    var streakCurrent: Int
    var streakBest: Int
    var last7DayDates: [String]
    var last7DayCompleted: [Int]
    var last7DayTotals: [Int]
    var completionOverallRate: Double
    var completionThisWeekRate: Double
    var completionTotalCompleted: Int
    var completionTotalObjectives: Int
    var weeklyProgressNumbers: [Int]
    var weeklyProgressRates: [Double]
    var weeklyProgressCompleted: [Int]
    var weeklyProgressTotals: [Int]
    var milestoneCompleted: Int
    var milestoneTotal: Int
    var updatedAt: Date

    init(goalId: String, stats: StatsDTO, updatedAt: Date = Date()) {
        self.goalId = goalId
        self.updatedAt = updatedAt
        streakCurrent = stats.streak.current
        streakBest = stats.streak.best
        last7DayDates = stats.streak.last7Days.map(\.date)
        last7DayCompleted = stats.streak.last7Days.map(\.objectivesCompleted)
        last7DayTotals = stats.streak.last7Days.map(\.objectivesTotal)
        completionOverallRate = stats.completion.overallRate
        completionThisWeekRate = stats.completion.thisWeekRate
        completionTotalCompleted = stats.completion.totalCompleted
        completionTotalObjectives = stats.completion.totalObjectives
        weeklyProgressNumbers = stats.weeklyProgress.map(\.weekNumber)
        weeklyProgressRates = stats.weeklyProgress.map(\.completionRate)
        weeklyProgressCompleted = stats.weeklyProgress.map(\.objectivesCompleted)
        weeklyProgressTotals = stats.weeklyProgress.map(\.objectivesTotal)
        milestoneCompleted = stats.milestones.completed
        milestoneTotal = stats.milestones.total
    }

    var stats: StatsDTO {
        let last7Days = zip(last7DayDates, zip(last7DayCompleted, last7DayTotals)).map { date, counts in
            DayActivityDTO(
                date: date,
                objectivesCompleted: counts.0,
                objectivesTotal: counts.1
            )
        }
        let weeklyProgress = zip(
            weeklyProgressNumbers,
            zip(weeklyProgressRates, zip(weeklyProgressCompleted, weeklyProgressTotals))
        ).map { weekNumber, values in
            WeeklyProgressDTO(
                weekNumber: weekNumber,
                completionRate: values.0,
                objectivesCompleted: values.1.0,
                objectivesTotal: values.1.1
            )
        }
        return StatsDTO(
            streak: StreakStatsDTO(
                current: streakCurrent,
                best: streakBest,
                last7Days: last7Days
            ),
            completion: CompletionStatsDTO(
                overallRate: completionOverallRate,
                thisWeekRate: completionThisWeekRate,
                totalCompleted: completionTotalCompleted,
                totalObjectives: completionTotalObjectives
            ),
            weeklyProgress: weeklyProgress,
            milestones: MilestoneProgressDTO(
                completed: milestoneCompleted,
                total: milestoneTotal
            )
        )
    }

    func update(with stats: StatsDTO) {
        streakCurrent = stats.streak.current
        streakBest = stats.streak.best
        last7DayDates = stats.streak.last7Days.map(\.date)
        last7DayCompleted = stats.streak.last7Days.map(\.objectivesCompleted)
        last7DayTotals = stats.streak.last7Days.map(\.objectivesTotal)
        completionOverallRate = stats.completion.overallRate
        completionThisWeekRate = stats.completion.thisWeekRate
        completionTotalCompleted = stats.completion.totalCompleted
        completionTotalObjectives = stats.completion.totalObjectives
        weeklyProgressNumbers = stats.weeklyProgress.map(\.weekNumber)
        weeklyProgressRates = stats.weeklyProgress.map(\.completionRate)
        weeklyProgressCompleted = stats.weeklyProgress.map(\.objectivesCompleted)
        weeklyProgressTotals = stats.weeklyProgress.map(\.objectivesTotal)
        milestoneCompleted = stats.milestones.completed
        milestoneTotal = stats.milestones.total
        updatedAt = Date()
    }
}
