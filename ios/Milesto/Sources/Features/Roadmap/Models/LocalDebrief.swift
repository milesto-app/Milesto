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
    var createdAt: String

    init(id: String, goalId: String, userId: String, weeklyPlanId: String? = nil, date: String, note: String, createdAt: String) {
        self.id = id
        self.goalId = goalId
        self.userId = userId
        self.weeklyPlanId = weeklyPlanId
        self.date = date
        self.note = note
        self.createdAt = createdAt
    }

    func update(with debrief: Debrief) {
        note = debrief.note
        weeklyPlanId = debrief.weeklyPlanId
    }
}
