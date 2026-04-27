import Foundation
import SwiftData

@Model
final class LocalGoal {
    @Attribute(.unique) var id: String
    var userId: String
    var title: String
    var goalDescription: String
    var status: String
    var createdAt: Date?

    init(id: String, userId: String, title: String, goalDescription: String, status: String, createdAt: Date? = nil) {
        self.id = id
        self.userId = userId
        self.title = title
        self.goalDescription = goalDescription
        self.status = status
        self.createdAt = createdAt
    }
}
