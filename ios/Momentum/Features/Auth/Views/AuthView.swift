import SwiftUI

struct AuthView: View {
    let onSignInWithApple: () -> Void
    let onSignInWithGoogle: () -> Void
    let onContinueWithEmail: () -> Void
    var isAppleLoading: Bool = false
    var isGoogleLoading: Bool = false

    private var isAnyLoading: Bool { isAppleLoading || isGoogleLoading }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("auth.welcome.title", table: "Auth", style: .largeTitle)
                    .alignment(.center)

                AppText("auth.welcome.subtitle", table: "Auth", style: .subheadline)
                    .alignment(.center)
            }
            .padding(.horizontal, AppTheme.Spacing.xl)

            Spacer()

            VStack(spacing: AppTheme.Spacing.sm) {
                Button(action: onSignInWithApple) {
                    Group {
                        if isAppleLoading {
                            ProgressView()
                                .tint(AppTheme.Colors.textPrimary)
                        } else {
                            HStack(spacing: AppTheme.Spacing.sm) {
                                Image("AppleLogo")
                                    .renderingMode(.template)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 18, height: 18)

                                Text("auth.welcome.apple", tableName: "Auth")
                                    .font(.headline)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .foregroundColor(AppTheme.Colors.textPrimary)
                    .background(.clear)
                    .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md))
                }
                .disabled(isAnyLoading)

                Button(action: onSignInWithGoogle) {
                    Group {
                        if isGoogleLoading {
                            ProgressView()
                                .tint(AppTheme.Colors.textPrimary)
                        } else {
                            HStack(spacing: AppTheme.Spacing.sm) {
                                Image("GoogleLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 18, height: 18)

                                Text("auth.welcome.google", tableName: "Auth")
                                    .font(.headline)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, AppTheme.Spacing.md)
                    .foregroundColor(AppTheme.Colors.textPrimary)
                    .background(.clear)
                    .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md))
                }
                .disabled(isAnyLoading)

                HStack(spacing: AppTheme.Spacing.md) {
                    Rectangle()
                        .fill(Color.secondary.opacity(0.5))
                        .frame(height: 0.5)

                    AppText("auth.welcome.or", table: "Auth", style: .caption)

                    Rectangle()
                        .fill(Color.secondary.opacity(0.5))
                        .frame(height: 0.5)
                }
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.vertical, AppTheme.Spacing.xxs)

            }
            .padding(.horizontal, AppTheme.Spacing.lg)

            AppButton("auth.welcome.email", table: "Auth", action: onContinueWithEmail)
                .icon(.mail)
                .fullWidth()
                .disabled(isAnyLoading)
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.top, AppTheme.Spacing.sm)
                .padding(.bottom, AppTheme.Spacing.xl)
        }
    }
}

#Preview {
    AuthView(
        onSignInWithApple: { },
        onSignInWithGoogle: { },
        onContinueWithEmail: { }
    )
}
