import SwiftUI

struct SubscriptionGateView<Content: View>: View {
    @Environment(AppEnv.self) private var env
    @ViewBuilder let content: () -> Content
    @State private var hasUnlocked = false

    var body: some View {
        ZStack {
            if hasUnlocked {
                content()
                    .transition(.opacity)
            }

            gateOverlay
        }
        .appBackground()
        .animation(.easeInOut(duration: 0.4), value: env.subscription.entitlementState)
        .animation(.easeInOut(duration: 0.4), value: env.subscription.isReconcilingEntitlement)
        .animation(.easeInOut(duration: 0.4), value: hasUnlocked)
        .task {
            if env.subscription.entitlementState == .subscribed {
                hasUnlocked = true
            }
            guard env.subscription.entitlementState == .unknown ||
                env.subscription.entitlementState == .connectionError
            else { return }
            await env.subscription.reconcileWithApi()
        }
        .onChange(of: env.subscription.entitlementState) { _, newValue in
            if newValue == .subscribed {
                hasUnlocked = true
            }
        }
    }

    @ViewBuilder
    private var gateOverlay: some View {
        switch env.subscription.entitlementState {
        case .unknown:
            Color("BackgroundBase").ignoresSafeArea()
        case .subscribed:
            EmptyView()
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
