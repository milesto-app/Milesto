import SwiftUI

struct PaywallGateView<Content: View>: View {
    @State private var subscription = SubscriptionService.shared
    #if DEBUG
        @State private var developerSettings = DeveloperSettings.shared
    #endif
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        Group {
            #if DEBUG
                if developerSettings.forcesPaywall {
                    PaywallView()
                        .transition(.opacity)
                } else if developerSettings.bypassesPaywall {
                    content()
                        .transition(.opacity)
                } else {
                    subscriptionGate
                }
            #else
                subscriptionGate
            #endif
        }
        .animation(.easeInOut(duration: 0.4), value: subscription.entitlementState)
        .task {
            #if DEBUG
                guard !developerSettings.forcesPaywall, !developerSettings.bypassesPaywall else { return }
            #endif
            await subscription.reconcileWithBackend()
        }
    }

    private var subscriptionGate: some View {
        Group {
            switch subscription.entitlementState {
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
                    await subscription.reconcileWithBackend()
                }
                .transition(.opacity)
            }
        }
    }
}
