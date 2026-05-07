import Foundation

struct RoadmapDTO: Codable {
    let goalId: String
    let userId: String
    let status: RoadmapStatus
    let createdAt: String
    let updatedAt: String
    let milestones: [MilestoneDTO]?
    let currentMilestoneId: String?

    enum CodingKeys: String, CodingKey {
        case status, milestones
        case goalId = "goal_id"
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case currentMilestoneId = "current_milestone_id"
    }
}

struct MilestoneDTO: Codable, Identifiable {
    let id: String
    let goalId: String
    let orderIndex: Int
    let title: String
    let description: String
    let expectedOutcome: String
    let targetMonth: Int
    let targetWeek: Int
    let isMonthlyCheckpoint: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case goalId = "goal_id"
        case orderIndex = "order_index"
        case expectedOutcome = "expected_outcome"
        case targetMonth = "target_month"
        case targetWeek = "target_week"
        case isMonthlyCheckpoint = "is_monthly_checkpoint"
        case createdAt = "created_at"
    }
}
