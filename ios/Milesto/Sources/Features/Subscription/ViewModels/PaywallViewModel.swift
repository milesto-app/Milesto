import Foundation

@MainActor
@Observable
final class PaywallViewModel {
    @ObservationIgnored private let env: AppEnv

    private(set) var selectedPlanId: String?

    init(env: AppEnv) {
        self.env = env
    }

    var plans: [SubscriptionPlan] {
        env.subscription.plans
    }

    var monthlyPlan: SubscriptionPlan? {
        env.subscription.monthlyPlan
    }

    var annualPlan: SubscriptionPlan? {
        env.subscription.annualPlan
    }

    var isPurchasing: Bool {
        env.subscription.isPurchasing
    }

    var purchaseErrorMessage: String? {
        guard let error = env.subscription.purchaseError else { return nil }
        switch error {
        case .missingUser:
            return String(localized: "paywall.error.generic", table: "Paywall")
        case let .storeFailure(detail):
            return detail
        case .verificationFailed:
            return String(localized: "paywall.error.verification", table: "Paywall")
        case .accountMismatch:
            return String(localized: "paywall.error.accountMismatch", table: "Paywall")
        }
    }

    func dismissPurchaseError() {
        env.subscription.purchaseError = nil
    }

    var isAnnualSelected: Bool {
        guard let annualId = annualPlan?.id else { return false }
        return selectedPlanId == annualId
    }

    var annualHasTrial: Bool {
        annualPlan?.hasIntroOffer ?? false
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
        await env.subscription.loadPlans()
        if selectedPlanId == nil {
            selectAnnual()
        }
    }

    func purchaseSelected() async {
        guard let id = selectedPlanId else { return }
        await env.subscription.purchase(planId: id)
    }

    func restore() async {
        await env.subscription.restore()
    }
}
