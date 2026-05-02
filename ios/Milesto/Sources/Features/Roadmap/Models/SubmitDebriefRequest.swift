import Foundation

struct SubmitDebriefRequest: Encodable {
    let weeklyPlanId: String
    let note: String

    enum CodingKeys: String, CodingKey {
        case note
        case weeklyPlanId = "weekly_plan_id"
    }
}
