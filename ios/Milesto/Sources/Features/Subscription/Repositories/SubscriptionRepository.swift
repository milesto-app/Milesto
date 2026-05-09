import Foundation
import OSLog
import StoreKit

private let subscriptionLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Subscription")

nonisolated struct VerifySubscriptionBodyDTO: Encodable {
    let transactionJws: String
}

nonisolated struct SubscriptionStatusResponseDTO: Decodable {
    let status: String
    let expiresAt: String?
    let productId: String?
    let autoRenew: Bool?
}

private enum SubscriptionSyncResult {
    case success
    case unauthorized
    case failed
}

@MainActor
@Observable
final class SubscriptionRepository {
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
        ApiClient.shared.setSubscriptionRequiredHandler { [weak self] in
            await self?.handleApiSubscriptionRequired()
        }
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
            userUUID = try await AuthSession.userUUID()
        } catch {
            purchaseError = .missingUser
            return
        }

        do {
            let result = try await product.purchase(options: [.appAccountToken(userUUID)])
            switch result {
            case let .success(verification):
                if case let .verified(tx) = verification {
                    let synced = await syncTransactionWithRetry(jws: verification.jwsRepresentation)
                    if synced == .success {
                        await tx.finish()
                        entitlementState = .subscribed
                    } else if synced == .unauthorized {
                        purchaseError = .accountMismatch
                    } else {
                        purchaseError = .verificationFailed
                    }
                }
            case .userCancelled, .pending:
                break
            @unknown default:
                break
            }
        } catch {
            subscriptionLogger.error("StoreKit purchase failed: \(String(describing: error), privacy: .public)")
            purchaseError = .storeFailure(error.localizedDescription)
        }
    }

    func restore() async {
        guard !isPurchasing else { return }
        isPurchasing = true
        purchaseError = nil
        defer { isPurchasing = false }
        try? await AppStore.sync()
        let unfinishedResult = await processUnfinishedTransactions()
        if unfinishedResult == .unauthorized {
            purchaseError = .accountMismatch
            return
        }
        await reconcileWithApi()
    }

    private func syncTransactionWithRetry(jws: String) async -> SubscriptionSyncResult {
        let delaysNanos: [UInt64] = [1_000_000_000, 2_000_000_000, 3_000_000_000]
        let body = VerifySubscriptionBodyDTO(transactionJws: jws)

        for (index, delay) in delaysNanos.enumerated() {
            if Task.isCancelled { return .failed }
            do {
                try await ApiClient.shared.requestVoid(method: "POST", path: "subscription/sync", body: body)
                return .success
            } catch ApiError.unauthorized {
                subscriptionLogger.warning("verify failed: transaction is not bound to the signed-in account")
                return .unauthorized
            } catch {
                subscriptionLogger.warning(
                    "verify attempt \(index + 1, privacy: .public) failed: \(String(describing: error), privacy: .public)"
                )
                if index < delaysNanos.count - 1 {
                    try? await Task.sleep(nanoseconds: delay)
                }
            }
        }

        subscriptionLogger.error("verify failed after retries")
        return .failed
    }

    private func processUnfinishedTransactions() async -> SubscriptionSyncResult {
        var syncResult: SubscriptionSyncResult = .success
        for await transactionResult in Transaction.unfinished {
            guard case let .verified(tx) = transactionResult else { continue }
            guard Self.productIds.contains(tx.productID) else {
                await tx.finish()
                continue
            }
            let synced = await syncTransactionWithRetry(jws: transactionResult.jwsRepresentation)
            if synced == .success {
                await tx.finish()
            } else if synced == .unauthorized {
                return .unauthorized
            } else {
                syncResult = .failed
            }
        }
        return syncResult
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

        let response: SubscriptionStatusResponseDTO
        do {
            response = try await ApiClient.shared.request(method: "GET", path: "subscription/status")
        } catch {
            subscriptionLogger.debug("reconcile status fetch failed")
            entitlementState = .connectionError
            return
        }

        if Self.isApiActive(response) {
            entitlementState = .subscribed
            return
        }

        if let entitlement = await currentVerifiedEntitlement() {
            let synced = await syncTransactionWithRetry(jws: entitlement.jws)
            if synced == .unauthorized {
                purchaseError = .accountMismatch
                entitlementState = .notSubscribed
                return
            }
            let refetched: SubscriptionStatusResponseDTO
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

    private static func isApiActive(_ response: SubscriptionStatusResponseDTO) -> Bool {
        guard response.status == "active" || response.status == "grace_period" else { return false }
        guard let expiresAtString = response.expiresAt,
              let expiresAt = parseISO8601(expiresAtString)
        else { return false }
        return expiresAt > Date()
    }

    private static func parseISO8601(_ string: String) -> Date? {
        for candidate in iso8601Candidates(from: string) {
            let withFraction = ISO8601DateFormatter()
            withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = withFraction.date(from: candidate) { return date }
            if let date = ISO8601DateFormatter().date(from: candidate) { return date }
        }
        return nil
    }

    private static func iso8601Candidates(from string: String) -> [String] {
        var candidates = [string]
        let postgresTimestamp = string.replacingOccurrences(of: " ", with: "T")
        candidates.append(postgresTimestamp)

        let normalizedTimezone = postgresTimestamp.replacingOccurrences(
            of: #"([+-]\d{2})$"#,
            with: "$1:00",
            options: .regularExpression
        )
        candidates.append(normalizedTimezone)

        return candidates
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
        let synced = await syncTransactionWithRetry(jws: jws)
        if synced == .success {
            await tx.finish()
            await refreshEntitlement()
        } else if synced == .unauthorized {
            purchaseError = .accountMismatch
        }
    }
}
