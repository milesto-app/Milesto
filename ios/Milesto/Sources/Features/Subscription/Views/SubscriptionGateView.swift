import SwiftUI

struct SubscriptionGateView<Content: View>: View {
    @Environment(AppEnv.self) private var env
    @ViewBuilder let content: () -> Content

    var body: some View {
        subscriptionGate
            .appBackground()
            .animation(.easeInOut(duration: 0.4), value: env.subscription.entitlementState)
            .animation(.easeInOut(duration: 0.4), value: env.subscription.isReconcilingEntitlement)
            .task {
                guard env.subscription.entitlementState == .unknown ||
                    env.subscription.entitlementState == .connectionError
                else { return }
                await env.subscription.reconcileWithApi()
            }
    }

    private var subscriptionGate: some View {
        Group {
            switch env.subscription.entitlementState {
            case .unknown:
                Color("BackgroundBase").ignoresSafeArea()
            case .subscribed:
                content()
                    .transition(.opacity)
            case .notSubscribed:
                PaywallView()
                    .transition(.opacity)
            case .connectionError:
                if env.subscription.isReconcilingEntitlement {
                    Color("BackgroundBase").ignoresSafeArea()
                } else {
                    PaywallConnectionErrorView {
                        await env.subscription.reconcileWithApi()
                    }
                    .transition(.opacity)
                }
            }
        }
    }
}
