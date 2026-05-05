import SwiftUI

struct SubscriptionGateView<Content: View>: View {
    @Environment(AppEnv.self) private var dependencies
    @ViewBuilder let content: () -> Content

    var body: some View {
        subscriptionGate
            .appBackground()
            .animation(.easeInOut(duration: 0.4), value: dependencies.subscription.entitlementState)
            .animation(.easeInOut(duration: 0.4), value: dependencies.subscription.isReconcilingEntitlement)
            .task {
                guard dependencies.subscription.entitlementState == .unknown ||
                    dependencies.subscription.entitlementState == .connectionError
                else { return }
                await dependencies.subscription.reconcileWithApi()
            }
    }

    private var subscriptionGate: some View {
        Group {
            switch dependencies.subscription.entitlementState {
            case .unknown:
                Color("BackgroundBase").ignoresSafeArea()
            case .subscribed:
                content()
                    .transition(.opacity)
            case .notSubscribed:
                PaywallView()
                    .transition(.opacity)
            case .connectionError:
                if dependencies.subscription.isReconcilingEntitlement {
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
