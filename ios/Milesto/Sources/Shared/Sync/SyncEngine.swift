import Foundation
import SwiftData

@MainActor
final class SyncEngine<Model: Syncable, Remote: SyncableRemote> where Remote.DTO == Model.DTO {
    private let modelContext: ModelContext
    private let remote: Remote
    private var isSyncing = false

    init(modelContext: ModelContext, remote: Remote) {
        self.modelContext = modelContext
        self.remote = remote
    }

    func sync() async throws {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        try dedupLocalIDs()
        try await pushLocalChanges()
        try await pullRemoteChanges()
    }

    private func pushLocalChanges() async throws {
        let all = try modelContext.fetch(FetchDescriptor<Model>())
        for item in all {
            switch item.syncStatus {
            case .pending:
                let confirmed = try await remote.upsert(item.toDTO())
                item.update(from: confirmed)
                item.syncStatus = .synced
            case .deletedLocally:
                try await remote.delete(id: item.id)
                modelContext.delete(item)
            case .synced:
                break
            }
        }
        try modelContext.save()
    }

    private func pullRemoteChanges() async throws {
        let remoteItems = try await remote.fetchAll()
        let remoteById = Dictionary(remoteItems.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })

        let localItems = try modelContext.fetch(FetchDescriptor<Model>())
        let localById = Dictionary(localItems.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })

        for remoteDTO in remoteItems {
            if let local = localById[remoteDTO.id] {
                guard local.syncStatus == .synced else { continue }
                if remoteDTO.updatedAt > local.updatedAt {
                    local.update(from: remoteDTO)
                }
            } else {
                modelContext.insert(Model.make(from: remoteDTO))
            }
        }

        for local in localItems where local.syncStatus == .synced {
            if remoteById[local.id] == nil {
                modelContext.delete(local)
            }
        }

        try modelContext.save()
    }

    private func dedupLocalIDs() throws {
        let all = try modelContext.fetch(FetchDescriptor<Model>())
        var seen = Set<Model.ID>()
        var changed = false
        for item in all {
            if !seen.insert(item.id).inserted {
                item.regenerateID()
                item.updatedAt = Date()
                item.syncStatus = .pending
                changed = true
            }
        }
        if changed {
            try modelContext.save()
        }
    }
}
