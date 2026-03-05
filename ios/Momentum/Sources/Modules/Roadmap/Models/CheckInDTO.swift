import Foundation

enum EnergyLevel: String, Codable {
    case high
    case good
    case low
    case veryLow = "very_low"
}

struct CheckInDTO: Codable, Identifiable {
    let id: String
    let goalId: String
    let userId: String
    let date: String
    let energyLevel: EnergyLevel
    let note: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, date, note
        case goalId = "goal_id"
        case userId = "user_id"
        case energyLevel = "energy_level"
        case createdAt = "created_at"
    }
}

struct SubmitCheckInRequest: Encodable {
    let energyLevel: EnergyLevel
    let note: String?

    enum CodingKeys: String, CodingKey {
        case note
        case energyLevel = "energy_level"
    }
}
