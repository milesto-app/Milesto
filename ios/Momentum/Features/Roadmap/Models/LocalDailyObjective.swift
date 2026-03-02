import Foundation
import SwiftData

@Model
final class LocalDailyObjective {
    @Attribute(.unique) var id: String
    var weeklyPlanId: String
    var goalId: String
    var userId: String
    var date: String
    var title: String
    var objectiveDescription: String
    var difficultyRating: String?
    var orderIndex: Int
    var isCompleted: Bool
    var isFallback: Bool
    var createdAt: String

    init(id: String, weeklyPlanId: String, goalId: String, userId: String, date: String, title: String, objectiveDescription: String, difficultyRating: String?, orderIndex: Int, isCompleted: Bool, isFallback: Bool, createdAt: String) {
        self.id = id
        self.weeklyPlanId = weeklyPlanId
        self.goalId = goalId
        self.userId = userId
        self.date = date
        self.title = title
        self.objectiveDescription = objectiveDescription
        self.difficultyRating = difficultyRating
        self.orderIndex = orderIndex
        self.isCompleted = isCompleted
        self.isFallback = isFallback
        self.createdAt = createdAt
    }
}
