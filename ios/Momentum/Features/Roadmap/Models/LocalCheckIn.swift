import Foundation
import SwiftData

@Model
final class LocalCheckIn {
    @Attribute(.unique) var id: String
    var goalId: String
    var userId: String
    var date: String
    var energyLevel: String
    var note: String?
    var createdAt: String

    init(id: String, goalId: String, userId: String, date: String, energyLevel: String, note: String?, createdAt: String) {
        self.id = id
        self.goalId = goalId
        self.userId = userId
        self.date = date
        self.energyLevel = energyLevel
        self.note = note
        self.createdAt = createdAt
    }
}
