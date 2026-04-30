import SwiftUI

struct PaywallGateView<Content: View>: View {
    @Environment(AppDependencies.self) private var dependencies
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
        .animation(.easeInOut(duration: 0.4), value: dependencies.entitlement.entitlementState)
        .task {
            #if DEBUG
                guard !developerSettings.forcesPaywall, !developerSettings.bypassesPaywall else { return }
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
