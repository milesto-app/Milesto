import Foundation

@MainActor
protocol SubscriptionRepository: AnyObject {
    var plans: [SubscriptionPlan] { get }
    var monthlyPlan: SubscriptionPlan? { get }
    var annualPlan: SubscriptionPlan? { get }
    var isPurchasing: Bool { get }
    var purchaseError: PurchaseError? { get set }

    func loadPlans() async
    func purchase(planId: String) async
    func restore() async
    func reconcileWithApi() async
}
