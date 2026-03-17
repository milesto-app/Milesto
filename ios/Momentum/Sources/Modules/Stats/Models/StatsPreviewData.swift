import Foundation

enum StatsPreviewData {
    static let stats = StatsDTO(
        streak: StreakStatsDTO(
            current: 12,
            best: 18,
            last7Days: [
                DayActivityDTO(date: "2026-02-28", objectivesCompleted: 3, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-01", objectivesCompleted: 4, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-02", objectivesCompleted: 2, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-03", objectivesCompleted: 4, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-04", objectivesCompleted: 3, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-05", objectivesCompleted: 4, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-06", objectivesCompleted: 2, objectivesTotal: 3),
            ]
        ),
        completion: CompletionStatsDTO(
            overallRate: 0.72,
            thisWeekRate: 0.85,
            totalCompleted: 86,
            totalObjectives: 120
        ),
        weeklyProgress: [
            WeeklyProgressDTO(weekNumber: 1, completionRate: 0.60, objectivesCompleted: 12, objectivesTotal: 20),
            WeeklyProgressDTO(weekNumber: 2, completionRate: 0.70, objectivesCompleted: 14, objectivesTotal: 20),
            WeeklyProgressDTO(weekNumber: 3, completionRate: 0.75, objectivesCompleted: 15, objectivesTotal: 20),
            WeeklyProgressDTO(weekNumber: 4, completionRate: 0.85, objectivesCompleted: 17, objectivesTotal: 20),
        ],
        milestones: MilestoneProgressDTO(completed: 3, total: 7)
    )
}
