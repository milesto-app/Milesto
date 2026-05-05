import Foundation

struct RoadmapSnapshot {
    var goalTitle: String?
    var goalTargetDate: Date?
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

struct DebriefPromptState {
    let weeklyPlanId: String?
    let shouldDisplay: Bool
}
