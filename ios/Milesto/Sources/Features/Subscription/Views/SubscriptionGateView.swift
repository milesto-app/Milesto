import SwiftUI

struct SubscriptionGateView<Content: View>: View {
    @Environment(AppDependencies.self) private var dependencies
    @ViewBuilder let content: () -> Content

    var body: some View {
        Group {
            #if DEBUG
                if dependencies.developerSettings.forcesPaywall {
                    PaywallView()
                        .transition(.opacity)
                } else if dependencies.developerSettings.bypassesPaywall {
                    content()
                        .transition(.opacity)
                } else {
                    subscriptionGate
                }
            #else
                subscriptionGate
            #endif
        }
        .appBackground()
        .animation(.easeInOut(duration: 0.4), value: dependencies.entitlement.entitlementState)
        .animation(.easeInOut(duration: 0.4), value: dependencies.entitlement.isReconcilingEntitlement)
        .task {
            #if DEBUG
                guard !dependencies.developerSettings.forcesPaywall, !dependencies.developerSettings.bypassesPaywall else { return }
            #endif
            guard dependencies.entitlement.entitlementState == .unknown ||
                dependencies.entitlement.entitlementState == .connectionError
            else { return }
            await dependencies.subscription.reconcileWithApi()
        }
    }

    private var subscriptionGate: some View {
        Group {
            switch dependencies.entitlement.entitlementState {
            case .unknown:
                Color("BackgroundBase").ignoresSafeArea()
            case .subscribed:
                content()
                    .transition(.opacity)
            case .notSubscribed:
                PaywallView()
                    .transition(.opacity)
            case .connectionError:
                if dependencies.entitlement.isReconcilingEntitlement {
                    Color("BackgroundBase").ignoresSafeArea()
                } else {
                    PaywallConnectionErrorView {
                        await dependencies.subscription.reconcileWithApi()
                    }
                    .transition(.opacity)
                }
            }
        }
    }
}
