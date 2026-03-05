import Foundation

enum CoachPersonality: String, CaseIterable, Identifiable {
    case motivateur
    case zen
    case strict
    case complice

    var id: String {
        rawValue
    }

    var title: String {
        switch self {
        case .motivateur: return String(localized: "coach.motivateur.title", table: "Coach")
        case .zen: return String(localized: "coach.zen.title", table: "Coach")
        case .strict: return String(localized: "coach.strict.title", table: "Coach")
        case .complice: return String(localized: "coach.complice.title", table: "Coach")
        }
    }

    var description: String {
        switch self {
        case .motivateur: return String(localized: "coach.motivateur.description", table: "Coach")
        case .zen: return String(localized: "coach.zen.description", table: "Coach")
        case .strict: return String(localized: "coach.strict.description", table: "Coach")
        case .complice: return String(localized: "coach.complice.description", table: "Coach")
        }
    }

    var icon: TablerIconOutline {
        switch self {
        case .motivateur: return .flame
        case .zen: return .leaf
        case .strict: return .bolt
        case .complice: return .heart
        }
    }

    var databaseId: Int {
        switch self {
        case .motivateur: return 1
        case .zen: return 2
        case .strict: return 3
        case .complice: return 4
        }
    }

    static func from(databaseId: Int) -> CoachPersonality? {
        allCases.first { $0.databaseId == databaseId }
    }

    init?(from dto: CoachDTO) {
        guard let match = Self(rawValue: dto.personality) else { return nil }
        self = match
    }
}
