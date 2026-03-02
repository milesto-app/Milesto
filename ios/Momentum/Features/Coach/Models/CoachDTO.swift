import Foundation

struct CoachDTO: Codable, Identifiable {
    let id: Int
    let personality: String
    let displayNameFr: String
    let displayNameEn: String
    let descriptionFr: String
    let descriptionEn: String
    let icon: String
    let deepgramVoiceId: String
    let deepgramVoiceModel: String
    let isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id, personality, icon
        case displayNameFr = "display_name_fr"
        case displayNameEn = "display_name_en"
        case descriptionFr = "description_fr"
        case descriptionEn = "description_en"
        case deepgramVoiceId = "deepgram_voice_id"
        case deepgramVoiceModel = "deepgram_voice_model"
        case isActive = "is_active"
    }
}
