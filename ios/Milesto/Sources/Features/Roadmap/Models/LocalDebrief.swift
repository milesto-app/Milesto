import Foundation
import SwiftData

@Model
final class LocalDebrief {
    @Attribute(.unique) var id: String
    var goalId: String
    var userId: String
    var weeklyPlanId: String?
    var date: String
    var note: String
    var taskRatingsJSON: Data?
    var createdAt: String

    init(id: String, goalId: String, userId: String, weeklyPlanId: String? = nil, date: String, note: String, taskRatingsJSON: Data?, createdAt: String) {
        self.id = id
        self.goalId = goalId
        self.userId = userId
        self.weeklyPlanId = weeklyPlanId
        self.date = date
        self.note = note
        self.taskRatingsJSON = taskRatingsJSON
        self.createdAt = createdAt
    }
}
