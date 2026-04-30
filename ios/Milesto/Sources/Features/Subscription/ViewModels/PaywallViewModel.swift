import Foundation

@MainActor
@Observable
final class PaywallViewModel {
    @ObservationIgnored private let subscription: any SubscriptionRepository

    var selectedPlanId: String?

    init(subscription: any SubscriptionRepository) {
        self.subscription = subscription
    }

    var plans: [SubscriptionPlan] { subscription.plans }
    var monthlyPlan: SubscriptionPlan? { subscription.monthlyPlan }
    var annualPlan: SubscriptionPlan? { subscription.annualPlan }
    var isPurchasing: Bool { subscription.isPurchasing }

    var purchaseError: String? {
        get { subscription.purchaseError }
        set { subscription.purchaseError = newValue }
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
