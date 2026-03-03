import SwiftUI

enum AuthFormMode {
    case signUp
    case signIn
}

private struct AuthModeToggle: View {
    @Binding var mode: AuthFormMode

    var body: some View {
        HStack(spacing: 0) {
            textLabel("auth.form.toggle.signup", for: .signUp)
            textLabel("auth.form.toggle.signin", for: .signIn)
        }
        .padding(4)
        .background {
            GeometryReader { geo in
                GlassEffectContainer(spacing: 0) {
                    Capsule()
                        .fill(.clear)
                        .glassEffect(.regular.interactive(), in: Capsule())
                        .frame(width: (geo.size.width - 4 * 2) / 2)
                        .padding(4)
                }
                .frame(maxWidth: .infinity, alignment: mode == .signUp ? .leading : .trailing)
            }
        }
        .animation(.spring(duration: 0.4, bounce: 0.35), value: mode)
    }

    private func textLabel(_ key: LocalizedStringKey, for targetMode: AuthFormMode) -> some View {
        AppText(key, table: "Auth", style: .headline)
            .weight(.semibold)
            .color(mode == targetMode ? AppTheme.Colors.textPrimary : AppTheme.Colors.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .contentShape(Capsule())
            .onTapGesture {
                mode = targetMode
            }
    }
}

struct AuthEmailView: View {
    @Binding var email: String
    @Binding var password: String
    let isLoading: Bool
    let onSignUp: () -> Void
    let onSignIn: () -> Void

    @State private var mode: AuthFormMode = .signUp

    private var isEmailValid: Bool {
        AuthValidation.isValidEmail(email)
    }

    private var isPasswordValid: Bool {
        password.count >= 8
    }

    private var canContinue: Bool {
        isEmailValid && isPasswordValid
    }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText(mode == .signUp ? "auth.signup.title" : "auth.signin.title", table: "Auth", style: .title)

                AppText(mode == .signUp ? "auth.signup.subtitle" : "auth.signin.subtitle", table: "Auth", style: .subheadline)
            }
            .padding(.top, 40 * 2)
            .padding(.bottom, 16)
            .contentTransition(.opacity)
            .animation(.easeInOut(duration: 0.25), value: mode)

            AuthModeToggle(mode: $mode)
                .padding(.horizontal, 24)

            VStack(spacing: 16) {
                AppTextField(
                    text: $email,
                    label: "auth.form.email",
                    table: "Auth",
                    textContentType: .emailAddress,
                    autocorrectionDisabled: true
                )

                AppTextField(
                    text: $password,
                    label: "auth.form.password",
                    table: "Auth",
                    isSecure: true,
                    textContentType: mode == .signUp ? .newPassword : .password
                )
            }
            .padding(.horizontal, 24)

            AppButton(
                mode == .signUp ? "auth.signup.button" : "auth.signin.button",
                table: "Auth",
                action: { mode == .signUp ? onSignUp() : onSignIn() }
            )
            .fullWidth()
            .disabled(!canContinue || isLoading)
            .padding(.horizontal, 24)
            .contentTransition(.opacity)
            .animation(.easeInOut(duration: 0.25), value: mode)

            if isLoading {
                ProgressView()
            }

            Spacer()
        }
    }
}

#Preview {
    NavigationStack {
        AuthEmailView(
            email: .constant(""),
            password: .constant(""),
            isLoading: false,
            onSignUp: { },
            onSignIn: { }
        )
    }
}
