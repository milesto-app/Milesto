import Foundation
import SwiftData

@Model
final class LocalRoadmap {
    @Attribute(.unique) var id: String
    var goalId: String
    var userId: String
    var status: String
    var createdAt: String
    var updatedAt: String
    var currentMilestoneId: String?
    @Relationship(deleteRule: .cascade) var milestones: [LocalMilestone]

    init(id: String, goalId: String, userId: String, status: String, createdAt: String, updatedAt: String, currentMilestoneId: String? = nil, milestones: [LocalMilestone] = []) {
        self.id = id
        self.goalId = goalId
        self.userId = userId
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.currentMilestoneId = currentMilestoneId
        self.milestones = milestones
    }
}
