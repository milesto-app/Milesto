import Foundation
import OSLog
import SwiftData

private nonisolated let outboxLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "SubscriptionOutbox")

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
        let descriptor = FetchDescriptor<LocalPendingSubscriptionSync>(
            predicate: #Predicate { $0.jwsRepresentation == jws }
        )
        if let existing = try? context.fetch(descriptor), !existing.isEmpty {
            outboxLogger.debug("enqueue skipped — duplicate JWS already pending")
            return
        }
        let pending = LocalPendingSubscriptionSync(jwsRepresentation: jws, userId: userId)
        context.insert(pending)
        do {
            try context.save()
            outboxLogger.debug("enqueued pending sync")
        } catch {
            outboxLogger.debug("enqueue save failed")
        }
    }
}
