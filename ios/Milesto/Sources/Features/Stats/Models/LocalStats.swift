import Foundation
import SwiftData

@Model
final class LocalStats {
    @Attribute(.unique) var goalId: String
    var payload: Data
    var updatedAt: Date
    var syncStatusRawValue: String = SyncStatus.synced.rawValue

    var id: String {
        goalId
    }

    init(goalId: String, stats: StatsDTO, updatedAt: Date = Date(), syncStatus: SyncStatus = .synced) {
        self.goalId = goalId
        let stats = stats.withSyncMetadata(goalId: goalId, updatedAt: updatedAt)
        payload = (try? JSONEncoder().encode(stats)) ?? Data()
        self.updatedAt = updatedAt
        syncStatusRawValue = syncStatus.rawValue
    }

    var stats: StatsDTO? {
        guard let decoded = try? JSONDecoder().decode(StatsDTO.self, from: payload) else {
            return nil
        }
        return decoded.withSyncMetadata(
            goalId: decoded.goalId.isEmpty ? goalId : decoded.goalId,
            updatedAt: decoded.updatedAt == .distantPast ? updatedAt : decoded.updatedAt
        )
    }

    func update(with stats: StatsDTO) {
        goalId = stats.id
        payload = (try? JSONEncoder().encode(stats)) ?? payload
        updatedAt = stats.updatedAt
        syncStatus = .synced
    }
}

extension LocalStats: Syncable {
    var syncStatus: SyncStatus {
        get {
            SyncStatus(rawValue: syncStatusRawValue) ?? .synced
        }
        set {
            syncStatusRawValue = newValue.rawValue
        }
    }

    static func make(from dto: StatsDTO) -> LocalStats {
        LocalStats(goalId: dto.id, stats: dto, updatedAt: dto.updatedAt, syncStatus: .synced)
    }

    func toDTO() -> StatsDTO {
        stats ?? .empty(goalId: goalId, updatedAt: updatedAt)
    }

    func update(from dto: StatsDTO) {
        update(with: dto)
    }

    func regenerateID() {}
}
