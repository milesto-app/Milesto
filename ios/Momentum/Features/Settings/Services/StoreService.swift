import Combine
import StoreKit

@MainActor
final class StoreService: ObservableObject {
    static let shared = StoreService()

    private let productIDs: Set<String> = ["6759965333", "6759965329"]

    @Published private(set) var products: [Product] = []
    @Published private(set) var purchasedProductIDs: Set<String> = []
    @Published private(set) var isLoading = false

    var isPro: Bool {
        !purchasedProductIDs.intersection(productIDs).isEmpty
    }

    private var transactionListener: Task<Void, Never>?

    private init() {
        transactionListener = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                await self.handleTransaction(result)
            }
        }
    }

    deinit {
        transactionListener?.cancel()
    }

    func loadProducts() async {
        isLoading = true
        do {
            products = try await Product.products(for: productIDs)
        } catch {
            products = []
        }
        isLoading = false
    }

    func purchase(_ product: Product) async throws {
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            purchasedProductIDs.insert(transaction.productID)
        case .userCancelled:
            return
        case .pending:
            return
        @unknown default:
            return
        }
    }

    func restorePurchases() async {
        var entitledIDs: Set<String> = []
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                entitledIDs.insert(transaction.productID)
            }
        }
        purchasedProductIDs = entitledIDs
    }

    func checkEntitlements() async {
        var entitledIDs: Set<String> = []
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                entitledIDs.insert(transaction.productID)
            }
        }
        purchasedProductIDs = entitledIDs
    }

    private func handleTransaction(_ result: VerificationResult<Transaction>) async {
        guard let transaction = try? checkVerified(result) else { return }

        if transaction.revocationDate != nil {
            purchasedProductIDs.remove(transaction.productID)
        } else {
            purchasedProductIDs.insert(transaction.productID)
        }

        await transaction.finish()
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.verificationFailed
        case .verified(let value):
            return value
        }
    }
}

enum StoreError: LocalizedError {
    case verificationFailed

    var errorDescription: String? {
        switch self {
        case .verificationFailed:
            return "Transaction verification failed"
        }
    }
}
