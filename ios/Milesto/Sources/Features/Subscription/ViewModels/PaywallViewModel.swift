import Foundation

@MainActor
@Observable
final class PaywallViewModel {
    @ObservationIgnored private let subscription: SubscriptionRepository

    private(set) var selectedPlanId: String?

    init(subscription: SubscriptionRepository) {
        self.subscription = subscription
    }

    var plans: [SubscriptionPlan] {
        subscription.plans
    }

    var monthlyPlan: SubscriptionPlan? {
        subscription.monthlyPlan
    }

    var annualPlan: SubscriptionPlan? {
        subscription.annualPlan
    }

    var isPurchasing: Bool {
        subscription.isPurchasing
    }

    var purchaseErrorMessage: String? {
        guard let error = subscription.purchaseError else { return nil }
        switch error {
        case .missingUser:
            return String(localized: "paywall.error.generic", table: "Paywall")
        case let .storeFailure(detail):
            return detail
        case .verificationFailed:
            return String(localized: "paywall.error.verification", table: "Paywall")
        }
    }

    func dismissPurchaseError() {
        subscription.purchaseError = nil
    }

    var isAnnualSelected: Bool {
        guard let annualId = annualPlan?.id else { return false }
        return selectedPlanId == annualId
    }

    var selectedPlan: SubscriptionPlan? {
        guard let id = selectedPlanId else { return nil }
        return plans.first { $0.id == id }
    }

    func selectAnnual() {
        selectedPlanId = annualPlan?.id
    }

    func selectMonthly() {
        selectedPlanId = monthlyPlan?.id
    }

    func loadPlans() async {
        await subscription.loadPlans()
        if selectedPlanId == nil {
            selectAnnual()
        }
    }

    func purchaseSelected() async {
        guard let id = selectedPlanId else { return }
        await subscription.purchase(planId: id)
    }

    func restore() async {
        await subscription.restore()
    }
}
