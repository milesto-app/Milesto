import SwiftUI

struct PaywallGateView<Content: View>: View {
    @State private var subscription = SubscriptionService.shared
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
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
        .animation(.easeInOut(duration: 0.4), value: subscription.entitlementState)
        .task {
            await subscription.reconcileWithBackend()
        }
    }
}
