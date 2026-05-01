import Foundation
import SwiftData

@Model
final class Goal: Decodable {
    @Attribute(.unique) var id: String
    var userId: String
    var title: String
    var goalDescription: String
    var status: String
    var targetDate: Date?
    var createdAt: Date?

    init(id: String, userId: String, title: String, goalDescription: String, status: String, targetDate: Date? = nil, createdAt: Date? = nil) {
        self.id = id
        self.userId = userId
        self.title = title
        self.goalDescription = goalDescription
        self.status = status
        self.targetDate = targetDate
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case status
        case userId = "user_id"
        case goalDescription = "description"
        case targetDate = "target_date"
        case createdAt = "created_at"
    }

    required convenience init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(String.self, forKey: .id)
        let userId = try container.decode(String.self, forKey: .userId)
        let title = try container.decode(String.self, forKey: .title)
        let goalDescription = try container.decode(String.self, forKey: .goalDescription)
        let status = try container.decode(String.self, forKey: .status)
        let targetDate = try Self.parseDate(container.decodeIfPresent(String.self, forKey: .targetDate))

        var createdAt: Date?
        if let createdAtString = try container.decodeIfPresent(String.self, forKey: .createdAt) {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            createdAt = isoFormatter.date(from: createdAtString) ?? ISO8601DateFormatter().date(from: createdAtString)
        }

        self.init(id: id, userId: userId, title: title, goalDescription: goalDescription, status: status, targetDate: targetDate, createdAt: createdAt)
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        if let date = ISO8601DateFormatter().date(from: value) {
            return date
        }

        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }
}

typealias LocalGoal = Goal
