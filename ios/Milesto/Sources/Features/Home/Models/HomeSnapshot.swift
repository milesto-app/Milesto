import Foundation

struct HomeSnapshot {
    var goalTitle: String?
    var currentMilestoneTitle: String?
    var weeklyPlan: WeeklyPlan?
    var tasks: [WeeklyTask]
    var todayDebrief: Debrief?
    var hasSyncError: Bool

    static let empty = HomeSnapshot(
        goalTitle: nil,
        currentMilestoneTitle: nil,
        weeklyPlan: nil,
        tasks: [],
        todayDebrief: nil,
        hasSyncError: false
    )
}
