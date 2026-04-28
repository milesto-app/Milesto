import CryptoKit
import Foundation
import OSLog
import SwiftData

private nonisolated let outboxLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto-ai", category: "SubscriptionOutbox")

private let maxDrainAttemptsPerEntry = 5

actor SubscriptionSyncOutbox {
    static let shared = SubscriptionSyncOutbox()

    private var container: ModelContainer?

    private init() {}

    func configure(container: ModelContainer) {
        self.container = container
    }

    private func makeContext() -> ModelContext? {
        guard let container else { return nil }
        return ModelContext(container)
    }

    func enqueue(jws: String, userId: String?) {
        guard let context = makeContext() else { return }
        let jwsKey = Self.key(for: jws)
        let descriptor = FetchDescriptor<PendingSubscriptionSync>(
            predicate: #Predicate { $0.jwsRepresentation == jwsKey }
        )
        if let existing = try? context.fetch(descriptor), !existing.isEmpty {
            outboxLogger.debug("enqueue skipped — duplicate JWS already pending")
            return
        }
        Keychain.setPendingSubscriptionJWS(jws, key: jwsKey)
        let pending = PendingSubscriptionSync(jwsRepresentation: jwsKey, userId: userId)
        context.insert(pending)
        do {
            try context.save()
            outboxLogger.debug("enqueued pending sync")
        } catch {
            outboxLogger.debug("enqueue save failed")
        }
    }

    func pendingCount() -> Int {
        guard let context = makeContext() else { return 0 }
        let descriptor = FetchDescriptor<PendingSubscriptionSync>()
        return (try? context.fetchCount(descriptor)) ?? 0
    }

    func drainAll(currentUserId: String?) async {
        guard let context = makeContext() else { return }
        let descriptor = FetchDescriptor<PendingSubscriptionSync>(
            sortBy: [SortDescriptor(\.createdAt, order: .forward)]
        )
        guard let pending = try? context.fetch(descriptor), !pending.isEmpty else { return }

        outboxLogger.debug("draining \(pending.count, privacy: .public) pending sync(s)")

        var succeeded = 0
        for entry in pending {
            if let tagged = entry.userId, let current = currentUserId, tagged != current {
                outboxLogger.debug("skip entry — userId mismatch")
                continue
            }
            if await entry.attemptCount >= maxDrainAttemptsPerEntry {
                outboxLogger.debug("skip entry — attempt cap reached")
                continue
            }
            guard let jws = Self.jws(for: entry) else {
                context.delete(entry)
                try? context.save()
                continue
            }
            let body = VerifySubscriptionBody(jwsTransaction: jws)
            do {
                try await BackendClient.shared.requestVoid(method: "POST", path: "subscription/verify", body: body)
                Self.removeJWS(for: entry)
                context.delete(entry)
                try context.save()
                succeeded += 1
            } catch {
                entry.attemptCount += 1
                try? context.save()
                outboxLogger.debug("drain entry failed, will retry later")
            }
        }
        outboxLogger.debug("drained \(succeeded, privacy: .public)/\(pending.count, privacy: .public)")
    }

    func purgeOlderThan(days: Int) async {
        guard let context = makeContext() else { return }
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        let descriptor = FetchDescriptor<PendingSubscriptionSync>(
            predicate: #Predicate { $0.createdAt < cutoff }
        )
        guard let stale = try? context.fetch(descriptor), !stale.isEmpty else { return }
        for entry in stale {
            Self.removeJWS(for: entry)
            context.delete(entry)
        }
        try? context.save()
        outboxLogger.debug("purged \(stale.count, privacy: .public) stale entries")
    }

    func purgeForUser(userId: String) async {
        guard let context = makeContext() else { return }
        let descriptor = FetchDescriptor<PendingSubscriptionSync>(
            predicate: #Predicate { $0.userId == userId }
        )
        guard let entries = try? context.fetch(descriptor), !entries.isEmpty else { return }
        for entry in entries {
            Self.removeJWS(for: entry)
            context.delete(entry)
        }
        try? context.save()
        outboxLogger.debug("purged \(entries.count, privacy: .public) entries for user")
    }

    func purgeAll() async throws {
        guard let context = makeContext() else { return }
        let descriptor = FetchDescriptor<PendingSubscriptionSync>()
        let entries = try context.fetch(descriptor)
        guard !entries.isEmpty else { return }
        for entry in entries {
            Self.removeJWS(for: entry)
            context.delete(entry)
        }
        try context.save()
        outboxLogger.debug("purged all pending subscription sync entries")
    }

    private static func key(for jws: String) -> String {
        let digest = SHA256.hash(data: Data(jws.utf8))
        let hash = digest.map { String(format: "%02x", $0) }.joined()
        return "subscription_jws_\(hash)"
    }

    private static func jws(for entry: PendingSubscriptionSync) -> String? {
        if entry.jwsRepresentation.hasPrefix("subscription_jws_") {
            return Keychain.pendingSubscriptionJWS(key: entry.jwsRepresentation)
        }
        return entry.jwsRepresentation
    }

    private static func removeJWS(for entry: PendingSubscriptionSync) {
        if entry.jwsRepresentation.hasPrefix("subscription_jws_") {
            Keychain.removePendingSubscriptionJWS(key: entry.jwsRepresentation)
        }
    }
}
