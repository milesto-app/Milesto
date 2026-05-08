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

            VStack(spacing: 12) {
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

                HStack(spacing: 16) {
                    Rectangle()
                        .fill(Color.secondary.opacity(0.9))
                        .frame(height: 0.5)

                    AppText("auth.welcome.or", table: "Auth", style: .caption)

                    Rectangle()
                        .fill(Color.secondary.opacity(0.9))
                        .frame(height: 0.5)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 4)
            }
            .padding(.horizontal, 24)

            AppButton("auth.welcome.email", table: "Auth", action: onContinueWithEmail)
                .icon(.mail)
                .fullWidth()
                .disabled(isAnyLoading)
                .padding(.horizontal, 24)
                .padding(.top, 12)
                .padding(.bottom, 32)
        }
        .appBackground()
    }
}
