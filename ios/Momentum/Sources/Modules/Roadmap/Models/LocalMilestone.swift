import Foundation
import SwiftData

@Model
final class LocalMilestone {
    @Attribute(.unique) var id: String
    var roadmapId: String
    var goalId: String
    var orderIndex: Int
    var title: String
    var milestoneDescription: String
    var expectedOutcome: String
    var targetMonth: Int
    var createdAt: String
    var roadmap: LocalRoadmap?

    init(id: String, roadmapId: String, goalId: String, orderIndex: Int, title: String, milestoneDescription: String, expectedOutcome: String, targetMonth: Int, createdAt: String) {
        self.id = id
        self.roadmapId = roadmapId
        self.goalId = goalId
        self.orderIndex = orderIndex
        self.title = title
        self.milestoneDescription = milestoneDescription
        self.expectedOutcome = expectedOutcome
        self.targetMonth = targetMonth
        self.createdAt = createdAt
    }
}
