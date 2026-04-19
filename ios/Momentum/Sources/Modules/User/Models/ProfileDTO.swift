import Foundation

struct ProfileDTO: Codable {
    let id: UUID
    var firstName: String?
    var lastName: String?
    var dateOfBirth: Date?
    var coachId: Int?
    var language: String?
    var notifPermissionStatus: String?
    var notifEnabled: Bool?
    var notifQuietStart: Int?
    var notifQuietEnd: Int?
    var notifPreferences: NotifPreferences?
    var createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case dateOfBirth = "date_of_birth"
        case coachId = "coach_id"
        case language
        case notifPermissionStatus = "notif_permission_status"
        case notifEnabled = "notif_enabled"
        case notifQuietStart = "notif_quiet_start"
        case notifQuietEnd = "notif_quiet_end"
        case notifPreferences = "notif_preferences"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        coachId = try container.decodeIfPresent(Int.self, forKey: .coachId)
        language = try container.decodeIfPresent(String.self, forKey: .language)
        notifPermissionStatus = try container.decodeIfPresent(String.self, forKey: .notifPermissionStatus)
        notifEnabled = try container.decodeIfPresent(Bool.self, forKey: .notifEnabled)
        notifQuietStart = try container.decodeIfPresent(Int.self, forKey: .notifQuietStart)
        notifQuietEnd = try container.decodeIfPresent(Int.self, forKey: .notifQuietEnd)
        notifPreferences = try container.decodeIfPresent(NotifPreferences.self, forKey: .notifPreferences)

        if let dateString = try container.decodeIfPresent(String.self, forKey: .dateOfBirth) {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            dateOfBirth = formatter.date(from: dateString)
        } else {
            dateOfBirth = nil
        }

        if let createdAtString = try container.decodeIfPresent(String.self, forKey: .createdAt) {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            createdAt = isoFormatter.date(from: createdAtString)
        } else {
            createdAt = nil
        }
    }

    init(
        id: UUID,
        firstName: String?,
        lastName: String?,
        dateOfBirth: Date?,
        coachId: Int?,
        language: String? = nil,
        notifPermissionStatus: String? = nil,
        notifEnabled: Bool? = nil,
        notifQuietStart: Int? = nil,
        notifQuietEnd: Int? = nil,
        notifPreferences: NotifPreferences? = nil,
        createdAt: Date? = nil
    ) {
        self.id = id
        self.firstName = firstName
        self.lastName = lastName
        self.dateOfBirth = dateOfBirth
        self.coachId = coachId
        self.language = language
        self.notifPermissionStatus = notifPermissionStatus
        self.notifEnabled = notifEnabled
        self.notifQuietStart = notifQuietStart
        self.notifQuietEnd = notifQuietEnd
        self.notifPreferences = notifPreferences
        self.createdAt = createdAt
    }
}

struct NotifPreferences: Codable {
    var global: NotifGlobalPreference?
    var kinds: [String: NotifKindPreference]

    init(global: NotifGlobalPreference? = nil, kinds: [String: NotifKindPreference] = [:]) {
        self.global = global
        self.kinds = kinds
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: DynamicKey.self)
        var parsedKinds: [String: NotifKindPreference] = [:]
        var parsedGlobal: NotifGlobalPreference?
        for key in container.allKeys {
            if key.stringValue == "global" {
                parsedGlobal = try container.decodeIfPresent(NotifGlobalPreference.self, forKey: key)
            } else if let kind = try container.decodeIfPresent(NotifKindPreference.self, forKey: key) {
                parsedKinds[key.stringValue] = kind
            }
        }
        global = parsedGlobal
        kinds = parsedKinds
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: DynamicKey.self)
        if let global, let key = DynamicKey(stringValue: "global") {
            try container.encode(global, forKey: key)
        }
        for (kindName, pref) in kinds {
            guard let key = DynamicKey(stringValue: kindName) else { continue }
            try container.encode(pref, forKey: key)
        }
    }

    func isEnabled(kind: String) -> Bool {
        kinds[kind]?.enabled ?? true
    }
}

struct NotifGlobalPreference: Codable {
    var pausedUntil: String?

    enum CodingKeys: String, CodingKey {
        case pausedUntil = "paused_until"
    }
}

struct NotifKindPreference: Codable {
    var enabled: Bool?
    var pausedUntil: String?

    enum CodingKeys: String, CodingKey {
        case enabled
        case pausedUntil = "paused_until"
    }
}

private struct DynamicKey: CodingKey {
    var stringValue: String
    var intValue: Int?

    init?(stringValue: String) {
        self.stringValue = stringValue
        intValue = nil
    }

    init?(intValue: Int) {
        stringValue = String(intValue)
        self.intValue = intValue
    }
}
