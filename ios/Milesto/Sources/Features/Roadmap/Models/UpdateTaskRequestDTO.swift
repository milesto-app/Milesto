import Foundation

struct UpdateTaskRequestDTO: Encodable {
    let isCompleted: Bool

    enum CodingKeys: String, CodingKey {
        case isCompleted = "is_completed"
    }
}
