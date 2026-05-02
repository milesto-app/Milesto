import Foundation

@MainActor
protocol EntitlementProviding: AnyObject {
    var entitlementState: EntitlementState { get }
    var isReconcilingEntitlement: Bool { get }
}
