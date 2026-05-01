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
        .task {
            #if DEBUG
                guard !dependencies.developerSettings.forcesPaywall, !dependencies.developerSettings.bypassesPaywall else { return }
            #endif
            await dependencies.subscription.reconcileWithBackend()
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
                PaywallConnectionErrorView {
                    await dependencies.subscription.reconcileWithBackend()
                }
                .transition(.opacity)
            }
        }
    }
}
