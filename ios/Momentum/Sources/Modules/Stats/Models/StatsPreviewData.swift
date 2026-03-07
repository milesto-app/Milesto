import Foundation

enum StatsPreviewData {
    static let stats = StatsDTO(
        streak: StreakStatsDTO(
            current: 12,
            best: 18,
            last7Days: [
                DayActivityDTO(date: "2026-02-28", hasCheckIn: true, objectivesCompleted: 3, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-01", hasCheckIn: true, objectivesCompleted: 4, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-02", hasCheckIn: true, objectivesCompleted: 2, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-03", hasCheckIn: true, objectivesCompleted: 4, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-04", hasCheckIn: true, objectivesCompleted: 3, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-05", hasCheckIn: true, objectivesCompleted: 4, objectivesTotal: 4),
                DayActivityDTO(date: "2026-03-06", hasCheckIn: true, objectivesCompleted: 2, objectivesTotal: 3),
            ]
        ),
        completion: CompletionStatsDTO(
            overallRate: 0.72,
            thisWeekRate: 0.85,
            totalCompleted: 86,
            totalObjectives: 120
        ),
        energy: EnergyStatsDTO(
            distribution: EnergyDistributionDTO(high: 8, good: 14, low: 5, veryLow: 2),
            recentHistory: [
                EnergyEntryDTO(date: "2026-02-21", level: "good"),
                EnergyEntryDTO(date: "2026-02-22", level: "high"),
                EnergyEntryDTO(date: "2026-02-23", level: "good"),
                EnergyEntryDTO(date: "2026-02-24", level: "low"),
                EnergyEntryDTO(date: "2026-02-25", level: "high"),
                EnergyEntryDTO(date: "2026-02-26", level: "good"),
                EnergyEntryDTO(date: "2026-02-27", level: "good"),
                EnergyEntryDTO(date: "2026-02-28", level: "high"),
                EnergyEntryDTO(date: "2026-03-01", level: "good"),
                EnergyEntryDTO(date: "2026-03-02", level: "low"),
                EnergyEntryDTO(date: "2026-03-03", level: "high"),
                EnergyEntryDTO(date: "2026-03-04", level: "good"),
                EnergyEntryDTO(date: "2026-03-05", level: "high"),
                EnergyEntryDTO(date: "2026-03-06", level: "good"),
            ]
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
