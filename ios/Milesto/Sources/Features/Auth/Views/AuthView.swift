import SwiftUI

struct AuthView: View {
    let onSignInWithApple: () -> Void
    let onSignInWithGoogle: () -> Void
    let onContinueWithEmail: () -> Void
    var isAppleLoading: Bool = false
    var isGoogleLoading: Bool = false

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
                Button(action: onSignInWithApple) {
                    Group {
                        if isAppleLoading {
                            ProgressView()
                                .tint(Color("TextPrimary"))
                        } else {
                            HStack(spacing: 12) {
                                Image("AppleLogo")
                                    .renderingMode(.template)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 18, height: 18)

                                AppText("auth.welcome.apple", table: "Auth", style: .headline)
                                    .weight(.semibold)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .foregroundColor(Color("TextPrimary"))
                    .background(.clear)
                    .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isAnyLoading)

                Button(action: onSignInWithGoogle) {
                    Group {
                        if isGoogleLoading {
                            ProgressView()
                                .tint(Color("TextPrimary"))
                        } else {
                            HStack(spacing: 12) {
                                Image("GoogleLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 18, height: 18)

                                AppText("auth.welcome.google", table: "Auth", style: .headline)
                                    .weight(.semibold)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .foregroundColor(Color("TextPrimary"))
                    .background(.clear)
                    .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isAnyLoading)

                HStack(spacing: 16) {
                    Rectangle()
                        .fill(Color.secondary.opacity(0.5))
                        .frame(height: 0.5)

                    AppText("auth.welcome.or", table: "Auth", style: .caption)

                    Rectangle()
                        .fill(Color.secondary.opacity(0.5))
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
