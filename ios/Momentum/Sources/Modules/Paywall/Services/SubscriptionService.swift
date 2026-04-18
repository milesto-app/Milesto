import Combine
import Foundation
import OSLog
import StoreKit
import Supabase

private let subscriptionLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.momentum-ai", category: "Subscription")

nonisolated struct VerifySubscriptionBody: Encodable, Sendable {
    let jwsTransaction: String
}

nonisolated struct SubscriptionStatusResponse: Decodable, Sendable {
    let status: String
    let expiresAt: String?
    let productId: String?
    let autoRenew: Bool?
}

@MainActor
final class SubscriptionService: ObservableObject {
    static let shared = SubscriptionService()

    static let monthlyProductId = "momentum_monthly"
    static let quarterlyProductId = "momentum_quarterly"

    enum EntitlementState: Equatable {
        case unknown
        case subscribed
        case notSubscribed
    }

    enum PurchaseError: LocalizedError {
        case missingUser

        var errorDescription: String? {
            String(localized: "paywall.error.generic", table: "Paywall")
        }
    }

    @Published private(set) var products: [Product] = []
    @Published private(set) var entitlementState: EntitlementState = .unknown
    @Published private(set) var isPurchasing = false
    @Published var purchaseError: String?

    private var updatesTask: Task<Void, Never>?
    private var onAppStartInFlight = false

    var isSubscribed: Bool {
        entitlementState == .subscribed
    }

    var monthlyProduct: Product? {
        products.first { $0.id == Self.monthlyProductId }
    }

    var quarterlyProduct: Product? {
        products.first { $0.id == Self.quarterlyProductId }
    }

    private init() {
        updatesTask = observeTransactionUpdates()
        Task {
            await refreshEntitlement()
            await loadProducts()
        }
    }

    func onAppStart() async {
        guard !onAppStartInFlight else { return }
        onAppStartInFlight = true
        defer { onAppStartInFlight = false }
        let userId = await currentUserId()
        await processUnfinishedTransactions()
        await SubscriptionSyncOutbox.shared.drainAll(currentUserId: userId)
        await SubscriptionSyncOutbox.shared.purgeOlderThan(days: 7)
        await reconcileWithBackend()
    }

    func loadProducts() async {
        do {
            let fetched = try await Product.products(for: [Self.quarterlyProductId, Self.monthlyProductId])
            products = fetched.sorted { lhs, _ in lhs.id == Self.quarterlyProductId }
        } catch {
            products = []
        }
    }

    func refreshEntitlement() async {
        for await result in Transaction.currentEntitlements {
            guard case let .verified(tx) = result else { continue }
            guard [Self.monthlyProductId, Self.quarterlyProductId].contains(tx.productID) else { continue }
            guard tx.revocationDate == nil, !tx.isUpgraded else { continue }
            entitlementState = .subscribed
            return
        }
        entitlementState = .notSubscribed
    }

    func purchase(_ product: Product) async {
        guard !isPurchasing else { return }
        isPurchasing = true
        purchaseError = nil
        defer { isPurchasing = false }

        let userUUID: UUID
        do {
            let session = try await Supabase.client.auth.session
            userUUID = session.user.id
        } catch {
            purchaseError = PurchaseError.missingUser.errorDescription
            return
        }

        do {
            let result = try await product.purchase(options: [.appAccountToken(userUUID)])
            switch result {
            case let .success(verification):
                if case let .verified(tx) = verification {
                    await syncTransactionWithRetry(jws: verification.jwsRepresentation)
                    await tx.finish()
                    entitlementState = .subscribed
                }
            case .userCancelled, .pending:
                break
            @unknown default:
                break
            }
        } catch {
            purchaseError = error.localizedDescription
        }
    }

    func restore() async {
        guard !isPurchasing else { return }
        isPurchasing = true
        defer { isPurchasing = false }
        try? await AppStore.sync()
        await processUnfinishedTransactions()
        await reconcileWithBackend()
    }

    private func syncTransactionWithRetry(jws: String) async {
        let delaysNanos: [UInt64] = [1_000_000_000, 2_000_000_000, 3_000_000_000]
        let body = VerifySubscriptionBody(jwsTransaction: jws)

        for (index, delay) in delaysNanos.enumerated() {
            if Task.isCancelled { return }
            do {
                try await BackendClient.shared.requestVoid(method: "POST", path: "subscription/verify", body: body)
                return
            } catch {
                subscriptionLogger.debug("verify attempt \(index + 1, privacy: .public) failed")
                if index < delaysNanos.count - 1 {
                    try? await Task.sleep(nanoseconds: delay)
                }
            }
        }

        subscriptionLogger.debug("verify failed after retries, enqueueing")
        await SubscriptionSyncOutbox.shared.enqueue(jws: jws, userId: await currentUserId())
    }

    private func currentUserId() async -> String? {
        do {
            let session = try await Supabase.client.auth.session
            return session.user.id.uuidString
        } catch {
            return nil
        }
    }

    private func processUnfinishedTransactions() async {
        for await result in Transaction.unfinished {
            guard case let .verified(tx) = result else { continue }
            guard [Self.monthlyProductId, Self.quarterlyProductId].contains(tx.productID) else {
                await tx.finish()
                continue
            }
            await syncTransactionWithRetry(jws: result.jwsRepresentation)
            await tx.finish()
        }
    }

    private func reconcileWithBackend() async {
        let response: SubscriptionStatusResponse
        do {
            response = try await BackendClient.shared.request(method: "GET", path: "subscription/status")
        } catch {
            subscriptionLogger.debug("reconcile status fetch failed — preserving current entitlement state")
            return
        }

        let backendActive = response.status == "active" || response.status == "grace_period"

        if backendActive {
            entitlementState = .subscribed
            return
        }

        if let entitlement = await currentVerifiedEntitlement() {
            await syncTransactionWithRetry(jws: entitlement.jws)
            let refetched: SubscriptionStatusResponse
            do {
                refetched = try await BackendClient.shared.request(method: "GET", path: "subscription/status")
            } catch {
                subscriptionLogger.debug("reconcile refetch failed — preserving current entitlement state")
                return
            }
            let refetchedActive = refetched.status == "active" || refetched.status == "grace_period"
            entitlementState = refetchedActive ? .subscribed : .notSubscribed
            return
        }

        entitlementState = .notSubscribed
    }

    private func currentVerifiedEntitlement() async -> (transaction: Transaction, jws: String)? {
        for await result in Transaction.currentEntitlements {
            guard case let .verified(tx) = result else { continue }
            guard [Self.monthlyProductId, Self.quarterlyProductId].contains(tx.productID) else { continue }
            guard tx.revocationDate == nil, !tx.isUpgraded else { continue }
            return (tx, result.jwsRepresentation)
        }
        return nil
    }

    private func observeTransactionUpdates() -> Task<Void, Never> {
        Task { [weak self] in
            for await result in Transaction.updates {
                guard case let .verified(tx) = result else { continue }
                await self?.handleTransactionUpdate(tx, jws: result.jwsRepresentation)
            }
        }
    }

    private func handleTransactionUpdate(_ tx: Transaction, jws: String) async {
        await syncTransactionWithRetry(jws: jws)
        await tx.finish()
        await refreshEntitlement()
    }
}
