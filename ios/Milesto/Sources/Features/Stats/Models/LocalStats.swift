import Foundation
import SwiftData

@Model
final class LocalStats {
    @Attribute(.unique) var goalId: String
    var payload: Data
    var updatedAt: Date

    init(goalId: String, stats: RemoteStats, updatedAt: Date = Date()) {
        self.goalId = goalId
        payload = (try? JSONEncoder().encode(stats)) ?? Data()
        self.updatedAt = updatedAt
    }

    var stats: RemoteStats? {
        try? JSONDecoder().decode(RemoteStats.self, from: payload)
    }

    func update(with stats: RemoteStats) {
        payload = (try? JSONEncoder().encode(stats)) ?? payload
        updatedAt = Date()
    }
}
