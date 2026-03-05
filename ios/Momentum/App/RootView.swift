import SwiftUI

struct RootView: View {
    @EnvironmentObject private var authService: AuthService

    var body: some View {
        Group {
            switch authService.authState {
            case .authenticating:
                ProgressView()
            case let .authenticated(userId):
                ProfileGateView(userId: userId)
            case .unauthenticated, .error:
                AuthContainerView()
            }
        }
    }
}

#Preview("Sans profil - Onboarding") {
    RootView()
        .environmentObject(AuthService.shared)
}
