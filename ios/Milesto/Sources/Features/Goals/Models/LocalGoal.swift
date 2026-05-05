import Foundation
import SwiftData

@Model
final class LocalGoal {
    @Attribute(.unique) var id: String
    var userId: String
    var title: String
    var goalDescription: String
    var status: String
    var targetDate: Date?
    var createdAt: Date?
    var updatedAt: Date
    var syncStatus: SyncStatus

    init(
        id: String,
        userId: String,
        title: String,
        goalDescription: String,
        status: String,
        targetDate: Date? = nil,
        createdAt: Date? = nil,
        updatedAt: Date = Date(),
        syncStatus: SyncStatus = .synced
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.goalDescription = goalDescription
        self.status = status
        self.targetDate = targetDate
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.syncStatus = syncStatus
    }

    var snapshot: GoalSnapshot {
        GoalSnapshot(
            id: id,
            title: title,
            targetDate: targetDate
        )
    }
}

nonisolated struct GoalDTO: SyncableDTO {
    let id: String
    let userId: String
    let title: String
    let description: String
    let status: GoalStatus
    let targetDate: Date?
    let createdAt: Date?
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case status
        case userId = "user_id"
        case description
        case targetDate = "target_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(
        id: String,
        userId: String,
        title: String,
        description: String,
        status: GoalStatus,
        targetDate: Date?,
        createdAt: Date?,
        updatedAt: Date
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.description = description
        self.status = status
        self.targetDate = targetDate
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decode(String.self, forKey: .description)
        let statusValue = try container.decode(String.self, forKey: .status)
        status = GoalStatus.from(statusValue)
        targetDate = try Self.parseDate(container.decodeIfPresent(String.self, forKey: .targetDate))

        if let createdAtString = try container.decodeIfPresent(String.self, forKey: .createdAt) {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            createdAt = isoFormatter.date(from: createdAtString) ?? ISO8601DateFormatter().date(from: createdAtString)
        } else {
            createdAt = nil
        }

        if let updatedAtString = try container.decodeIfPresent(String.self, forKey: .updatedAt) {
            updatedAt = Self.parseDateTime(updatedAtString) ?? Date()
        } else {
            updatedAt = createdAt ?? Date()
        }
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

    private static func parseDateTime(_ value: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }
}

struct GoalSnapshot: Identifiable, Hashable {
    let id: String
    let title: String
    let targetDate: Date?
}

struct GoalSummary: Identifiable, Hashable {
    let id: String
}

extension LocalGoal {
    convenience init(remote: GoalDTO) {
        self.init(
            id: remote.id,
            userId: remote.userId,
            title: remote.title,
            goalDescription: remote.description,
            status: remote.status.rawValue,
            targetDate: remote.targetDate,
            createdAt: remote.createdAt,
            updatedAt: remote.updatedAt,
            syncStatus: .synced
        )
    }

    func update(with remote: GoalDTO) {
        update(from: remote)
        syncStatus = .synced
    }
}

extension LocalGoal: Syncable {
    static func make(from dto: GoalDTO) -> LocalGoal {
        LocalGoal(remote: dto)
    }

    func toDTO() -> GoalDTO {
        GoalDTO(
            id: id,
            userId: userId,
            title: title,
            description: goalDescription,
            status: GoalStatus.from(status),
            targetDate: targetDate,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }

    func update(from dto: GoalDTO) {
        title = dto.title
        goalDescription = dto.description
        status = dto.status.rawValue
        targetDate = dto.targetDate
        createdAt = dto.createdAt
        updatedAt = dto.updatedAt
    }

    func regenerateID() {
        id = UUID().uuidString
    }
}
