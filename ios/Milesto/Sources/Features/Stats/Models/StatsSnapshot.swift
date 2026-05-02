import Foundation

struct StatsSnapshot {
    let streakCurrent: Int
    let streakBest: Int
    let last7Days: [DayActivitySnapshot]
    let overallCompleted: Int
    let overallTotal: Int
    let overallRate: Double
    let thisWeekRate: Double
    let weeklyProgress: [WeeklyProgressSnapshot]
    let milestoneCompleted: Int
    let milestoneTotal: Int

    var thisWeekCompleted: Int {
        weeklyProgress.last?.objectivesCompleted ?? Int(thisWeekRate * Double(overallTotal))
    }

    var thisWeekTotal: Int {
        weeklyProgress.last?.objectivesTotal ?? overallTotal
    }
}

struct DayActivitySnapshot: Identifiable {
    var id: String {
        date
    }

    let date: String
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

struct WeeklyProgressSnapshot: Identifiable {
    var id: Int {
        weekNumber
    }

    let weekNumber: Int
    let completionRate: Double
    let objectivesCompleted: Int
    let objectivesTotal: Int
}

extension RemoteStats {
    var snapshot: StatsSnapshot {
        StatsSnapshot(
            streakCurrent: streak.current,
            streakBest: streak.best,
            last7Days: streak.last7Days.map {
                DayActivitySnapshot(
                    date: $0.date,
                    objectivesCompleted: $0.objectivesCompleted,
                    objectivesTotal: $0.objectivesTotal
                )
            },
            overallCompleted: completion.totalCompleted,
            overallTotal: completion.totalObjectives,
            overallRate: completion.overallRate,
            thisWeekRate: completion.thisWeekRate,
            weeklyProgress: weeklyProgress.map {
                WeeklyProgressSnapshot(
                    weekNumber: $0.weekNumber,
                    completionRate: $0.completionRate,
                    objectivesCompleted: $0.objectivesCompleted,
                    objectivesTotal: $0.objectivesTotal
                )
            },
            milestoneCompleted: milestones.completed,
            milestoneTotal: milestones.total
        )
    }
}
