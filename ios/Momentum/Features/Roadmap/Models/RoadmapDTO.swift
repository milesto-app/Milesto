import Foundation

enum RoadmapStatus: String, Codable {
    case generating
    case complete
    case failed
}

struct RoadmapDTO: Codable {
    let id: String
    let goalId: String
    let userId: String
    let status: RoadmapStatus
    let generationAttempts: Int
    let createdAt: String
    let updatedAt: String
    let milestones: [MilestoneDTO]?
    let currentMilestoneId: String?

    enum CodingKeys: String, CodingKey {
        case id, status, milestones
        case goalId = "goal_id"
        case userId = "user_id"
        case generationAttempts = "generation_attempts"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case currentMilestoneId = "current_milestone_id"
    }
}

struct MilestoneDTO: Codable, Identifiable {
    let id: String
    let roadmapId: String
    let goalId: String
    let orderIndex: Int
    let title: String
    let description: String
    let expectedOutcome: String
    let targetMonth: Int
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case roadmapId = "roadmap_id"
        case goalId = "goal_id"
        case orderIndex = "order_index"
        case expectedOutcome = "expected_outcome"
        case targetMonth = "target_month"
        case createdAt = "created_at"
    }
}

struct MilestoneSummaryDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let expectedOutcome: String
    let targetMonth: Int
    let orderIndex: Int

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case expectedOutcome = "expected_outcome"
        case targetMonth = "target_month"
        case orderIndex = "order_index"
    }
}
