import Foundation
import OSLog
import StoreKit
import Supabase

private let subscriptionLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Subscription")

nonisolated struct VerifySubscriptionBody: Encodable {
    let jwsTransaction: String
}

nonisolated struct SubscriptionStatusResponse: Decodable {
    let status: String
    let expiresAt: String?
    let productId: String?
    let autoRenew: Bool?
}

@MainActor
@Observable
final class SyncingSubscriptionRepository: EntitlementProviding, SubscriptionRepository {
    static let monthlyProductId = "milesto_plus_monthly"
    static let annualProductId = "milesto_plus_annual"

    private static let productIds = [annualProductId, monthlyProductId]

    private(set) var products: [Product] = []
    private(set) var entitlementState: EntitlementState = .unknown
    private(set) var isReconcilingEntitlement = false
    private(set) var isPurchasing = false
    var purchaseError: PurchaseError?

    private var updatesTask: Task<Void, Never>?
    private var reconcileTask: Task<Void, Never>?

    var plans: [SubscriptionPlan] {
        products.map(makePlan)
    }

    var monthlyPlan: SubscriptionPlan? {
        plans.first { $0.id == Self.monthlyProductId }
    }

    var annualPlan: SubscriptionPlan? {
        plans.first { $0.id == Self.annualProductId }
    }

    init() {
        updatesTask = observeTransactionUpdates()
        Task {
            await loadPlans()
        }
    }

    private func makePlan(_ product: Product) -> SubscriptionPlan {
        SubscriptionPlan(
            id: product.id,
            displayPrice: product.displayPrice
        )
    }

    func loadPlans() async {
        do {
            let fetched = try await Product.products(for: Self.productIds)
            products = fetched.sorted { lhs, _ in lhs.id == Self.annualProductId }
        } catch {
            products = []
        }
    }

    func refreshEntitlement() async {
        for await result in Transaction.currentEntitlements {
            guard case let .verified(tx) = result else { continue }
            guard Self.productIds.contains(tx.productID) else { continue }
            guard tx.revocationDate == nil, !tx.isUpgraded else { continue }
            entitlementState = .subscribed
            return
        }
        entitlementState = .notSubscribed
    }

    func handleApiSubscriptionRequired() async {
        entitlementState = .notSubscribed
        await reconcileWithApi()
    }

    func purchase(planId: String) async {
        guard !isPurchasing else { return }
        guard let product = products.first(where: { $0.id == planId }) else {
            purchaseError = .missingUser
            return
        }
        isPurchasing = true
        purchaseError = nil
        defer { isPurchasing = false }

        let userUUID: UUID
        do {
            let session = try await SupabaseConfig.client.auth.session
            userUUID = session.user.id
        } catch {
            purchaseError = .missingUser
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
            purchaseError = .storeFailure(error.localizedDescription)
        }
    }

    func restore() async {
        guard !isPurchasing else { return }
        isPurchasing = true
        defer { isPurchasing = false }
        try? await AppStore.sync()
        await processUnfinishedTransactions()
        await reconcileWithApi()
    }

    private func syncTransactionWithRetry(jws: String) async {
        let delaysNanos: [UInt64] = [1_000_000_000, 2_000_000_000, 3_000_000_000]
        let body = VerifySubscriptionBody(jwsTransaction: jws)

        for (index, delay) in delaysNanos.enumerated() {
            if Task.isCancelled { return }
            do {
                try await ApiClient.shared.requestVoid(method: "POST", path: "subscription/verify", body: body)
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
            let session = try await SupabaseConfig.client.auth.session
            return session.user.id.uuidString
        } catch {
            return nil
        }
    }

    private func processUnfinishedTransactions() async {
        for await result in Transaction.unfinished {
            guard case let .verified(tx) = result else { continue }
            guard Self.productIds.contains(tx.productID) else {
                await tx.finish()
                continue
            }
            await syncTransactionWithRetry(jws: result.jwsRepresentation)
            await tx.finish()
        }
    }

    func reconcileWithApi() async {
        if let reconcileTask {
            await reconcileTask.value
            return
        }

        isReconcilingEntitlement = true
        let task = Task { @MainActor [weak self] in
            guard let self else { return }
            await self.performApiReconciliation()
        }
        reconcileTask = task
        await task.value
    }

    private func performApiReconciliation() async {
        defer {
            isReconcilingEntitlement = false
            reconcileTask = nil
        }

        let response: SubscriptionStatusResponse
        do {
            response = try await ApiClient.shared.request(method: "GET", path: "subscription/status")
        } catch {
            subscriptionLogger.debug("reconcile status fetch failed")
            if await currentVerifiedEntitlement() != nil {
                entitlementState = .subscribed
            } else if entitlementState != .subscribed {
                entitlementState = .connectionError
            }
            return
        }

        if Self.isApiActive(response) {
            entitlementState = .subscribed
            return
        }

        if let entitlement = await currentVerifiedEntitlement() {
            await syncTransactionWithRetry(jws: entitlement.jws)
            let refetched: SubscriptionStatusResponse
            do {
                refetched = try await ApiClient.shared.request(method: "GET", path: "subscription/status")
            } catch {
                subscriptionLogger.debug("reconcile refetch failed — preserving current entitlement state")
                if entitlementState != .subscribed {
                    entitlementState = .connectionError
                }
                return
            }
            entitlementState = Self.isApiActive(refetched) ? .subscribed : .notSubscribed
            return
        }

        entitlementState = .notSubscribed
    }

    private static func isApiActive(_ response: SubscriptionStatusResponse) -> Bool {
        guard response.status == "active" || response.status == "grace_period" else { return false }
        guard let expiresAtString = response.expiresAt,
              let expiresAt = parseISO8601(expiresAtString)
        else { return false }
        return expiresAt > Date()
    }

    private static func parseISO8601(_ string: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: string) { return date }
        return ISO8601DateFormatter().date(from: string)
    }

    private func currentVerifiedEntitlement() async -> (transaction: Transaction, jws: String)? {
        for await result in Transaction.currentEntitlements {
            guard case let .verified(tx) = result else { continue }
            guard Self.productIds.contains(tx.productID) else { continue }
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
