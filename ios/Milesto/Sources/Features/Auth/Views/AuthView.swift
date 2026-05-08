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
                AuthProviderButton(
                    title: "auth.welcome.apple",
                    logoName: "AppleLogo",
                    rendersAsTemplate: true,
                    isLoading: isAppleLoading,
                    action: onSignInWithApple
                )
                .disabled(isAnyLoading)

                AuthProviderButton(
                    title: "auth.welcome.google",
                    logoName: "GoogleLogo",
                    isLoading: isGoogleLoading,
                    action: onSignInWithGoogle
                )
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

private struct AuthProviderButton: View {
    let title: LocalizedStringKey
    let logoName: String
    var rendersAsTemplate = false
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                HStack(spacing: 12) {
                    logo

                    AppText(title, table: "Auth", style: .headline)
                        .weight(.semibold)
                }
                .opacity(isLoading ? 0 : 1)

                if isLoading {
                    AppLoader(color: Color("TextPrimary"))
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .foregroundColor(Color("TextPrimary"))
        .background(.clear)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))
    }

    private var logo: some View {
        Image(logoName)
            .renderingMode(rendersAsTemplate ? .template : .original)
            .resizable()
            .scaledToFit()
            .frame(width: 18, height: 18)
    }
}
