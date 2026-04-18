import Combine
import Foundation
import StoreKit

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

    @Published private(set) var products: [Product] = []
    @Published private(set) var entitlementState: EntitlementState = .unknown
    @Published private(set) var isPurchasing = false
    @Published var purchaseError: String?

    private var updatesTask: Task<Void, Never>?

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

    deinit {
        updatesTask?.cancel()
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

        do {
            let result = try await product.purchase()
            switch result {
            case let .success(verification):
                if case let .verified(tx) = verification {
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
        await refreshEntitlement()
    }

    private func observeTransactionUpdates() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case let .verified(tx) = result {
                    await tx.finish()
                    await self?.refreshEntitlement()
                }
            }
        }
    }
}
