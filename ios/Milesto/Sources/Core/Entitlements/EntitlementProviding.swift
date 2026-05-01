import Foundation

@MainActor
protocol EntitlementProviding: AnyObject {
    var entitlementState: EntitlementState { get }
    var isReconcilingEntitlement: Bool { get }
    var isSubscribed: Bool { get }
    func refreshEntitlement() async
    func reconcileWithBackend() async
    func handleBackendSubscriptionRequired() async
}
