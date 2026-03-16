import Foundation
import SwiftData

@Model
final class LocalWeeklyPlan {
    @Attribute(.unique) var id: String
    var roadmapId: String
    var milestoneId: String
    var goalId: String
    var userId: String
    var weekNumber: Int
    var weekStartDate: String
    var focus: String
    var objectives: [String]
    var status: String
    var isFallback: Bool
    var createdAt: String
    var summaryCompletionRate: Double?
    var summaryTasksCompleted: Int?
    var summaryTasksTotal: Int?
    var summaryDebriefCount: Int?
    var summaryNarrative: String?

    var weeklyPlanStatus: WeeklyPlanStatus {
        WeeklyPlanStatus(rawValue: status) ?? .active
    }

    var summary: WeeklySummaryDTO? {
        guard let completionRate = summaryCompletionRate,
              let tasksCompleted = summaryTasksCompleted,
              let tasksTotal = summaryTasksTotal else { return nil }
        return WeeklySummaryDTO(
            completionRate: completionRate,
            tasksCompleted: tasksCompleted,
            tasksTotal: tasksTotal,
            debriefCount: summaryDebriefCount,
            narrative: summaryNarrative
        )
    }

    init(id: String, roadmapId: String, milestoneId: String, goalId: String, userId: String, weekNumber: Int, weekStartDate: String, focus: String, objectives: [String], status: String, isFallback: Bool, createdAt: String, summary: WeeklySummaryDTO? = nil) {
        self.id = id
        self.roadmapId = roadmapId
        self.milestoneId = milestoneId
        self.goalId = goalId
        self.userId = userId
        self.weekNumber = weekNumber
        self.weekStartDate = weekStartDate
        self.focus = focus
        self.objectives = objectives
        self.status = status
        self.isFallback = isFallback
        self.createdAt = createdAt
        summaryCompletionRate = summary?.completionRate
        summaryTasksCompleted = summary?.tasksCompleted
        summaryTasksTotal = summary?.tasksTotal
        summaryDebriefCount = summary?.debriefCount
        summaryNarrative = summary?.narrative
    }
}
