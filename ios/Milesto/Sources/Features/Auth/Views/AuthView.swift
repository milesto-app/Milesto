import SwiftUI

struct AuthView: View {
    let onSignInWithApple: () -> Void
    let onSignInWithGoogle: () -> Void
    let onContinueWithEmail: () -> Void
    let isAppleLoading: Bool
    let isGoogleLoading: Bool

    private var isAnyLoading: Bool {
        isAppleLoading || isGoogleLoading
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 8) {
                AppText("auth.welcome.title", table: "Auth", style: .largeTitle)
                    .alignment(.center)

                AppText("auth.welcome.subtitle", table: "Auth", style: .subheadline)
                    .alignment(.center)
            }
            .padding(.horizontal, 32)

            Spacer()

            VStack(spacing: 8) {
                AppButton("auth.welcome.apple", table: "Auth", style: .secondary, action: onSignInWithApple)
                    .assetIcon("AppleLogo", rendersAsTemplate: true)
                    .fullWidth()
                    .loading(isAppleLoading)
                    .disabled(isAnyLoading)

                AppButton("auth.welcome.google", table: "Auth", style: .secondary, action: onSignInWithGoogle)
                    .assetIcon("GoogleLogo")
                    .fullWidth()
                    .loading(isGoogleLoading)
                    .disabled(isAnyLoading)

                AppButton("auth.welcome.email", table: "Auth", style: .ghost, action: onContinueWithEmail)
                    .icon(.mail)
                    .fullWidth()
                    .disabled(isAnyLoading)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .appBackground()
    }
}
