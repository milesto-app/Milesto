import Foundation
import SwiftData

@Model
final class LocalWeeklyTask {
    @Attribute(.unique) var id: String
    var weeklyPlanId: String
    var goalId: String
    var userId: String
    var title: String
    var taskDescription: String
    var estimatedMinutes: Int?
    var orderIndex: Int
    var isCompleted: Bool
    var isFallback: Bool
    var createdAt: String

    init(id: String, weeklyPlanId: String, goalId: String, userId: String, title: String, taskDescription: String, estimatedMinutes: Int?, orderIndex: Int, isCompleted: Bool, isFallback: Bool, createdAt: String) {
        self.id = id
        self.weeklyPlanId = weeklyPlanId
        self.goalId = goalId
        self.userId = userId
        self.title = title
        self.taskDescription = taskDescription
        self.estimatedMinutes = estimatedMinutes
        self.orderIndex = orderIndex
        self.isCompleted = isCompleted
        self.isFallback = isFallback
        self.createdAt = createdAt
    }
}
