import Foundation

enum SyncStatus: String, Codable {
    case pending
    case synced
    case deletedLocally
}
