import Foundation

struct SubmitDebriefRequestDTO: Encodable {
    let milestoneId: String
    let note: String

    enum CodingKeys: String, CodingKey {
        case note
        case milestoneId = "milestone_id"
    }
}
