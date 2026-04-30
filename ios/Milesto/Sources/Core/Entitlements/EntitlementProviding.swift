import Foundation

@MainActor
protocol EntitlementProviding: AnyObject {
    var entitlementState: EntitlementState { get }
    var isSubscribed: Bool { get }
    func refreshEntitlement() async
    func reconcileWithBackend() async
    func handleBackendSubscriptionRequired() async
}

@MainActor
enum EntitlementResolver {
    static var current: (any EntitlementProviding)?
}
