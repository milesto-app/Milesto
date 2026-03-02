import Foundation

struct PaginatedResponse<T: Decodable>: Decodable {
    let data: [T]
    let total: Int
    let limit: Int
    let offset: Int
}
