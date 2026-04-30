import SwiftUI

@MainActor
@Observable
final class AppDependencies {
    let auth: any AuthSessionProviding
    let entitlement: any EntitlementProviding

    init(
        auth: any AuthSessionProviding,
        entitlement: any EntitlementProviding
    ) {
        self.auth = auth
        self.entitlement = entitlement
    }
}
