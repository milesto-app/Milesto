import Foundation
import SwiftData

@Model
final class LocalStats {
    @Attribute(.unique) var goalId: String
    var payload: Data
    var updatedAt: Date

    init(goalId: String, stats: StatsDTO, updatedAt: Date = Date()) {
        self.goalId = goalId
        payload = (try? JSONEncoder().encode(stats)) ?? Data()
        self.updatedAt = updatedAt
    }

    var stats: StatsDTO? {
        try? JSONDecoder().decode(StatsDTO.self, from: payload)
    }

    func update(with stats: StatsDTO) {
        payload = (try? JSONEncoder().encode(stats)) ?? payload
        updatedAt = Date()
    }
}
