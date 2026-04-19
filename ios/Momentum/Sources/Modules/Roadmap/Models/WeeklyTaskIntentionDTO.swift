import Foundation

struct WeeklyTaskIntentionDTO: Codable, Equatable {
    let taskId: String
    let dayOfWeek: Int
    let localHour: Int
    let locationLabel: String?

    enum CodingKeys: String, CodingKey {
        case taskId = "task_id"
        case dayOfWeek = "day_of_week"
        case localHour = "local_hour"
        case locationLabel = "location_label"
    }
}

struct UpsertIntentionRequest: Encodable {
    let taskId: String
    let dayOfWeek: Int
    let localHour: Int
    let locationLabel: String?

    enum CodingKeys: String, CodingKey {
        case taskId = "task_id"
        case dayOfWeek = "day_of_week"
        case localHour = "local_hour"
        case locationLabel = "location_label"
    }
}
