import Foundation
import SwiftUI

struct AuthMagicLinkSheet: View {
    @Environment(AppEnv.self) private var env
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var didSendLink = false
    @State private var errorMessage: String?

    private static let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"

    private var isEmailValid: Bool {
        let predicate = NSPredicate(format: "SELF MATCHES %@", Self.emailRegex)
        return predicate.evaluate(with: email)
    }

    private var canSend: Bool {
        isEmailValid && !isLoading
    }

    var body: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                AppText(didSendLink ? "auth.magic.sent.title" : "auth.magic.title", table: "Auth", style: .title)
                    .alignment(.center)

                AppText(didSendLink ? "auth.magic.sent.subtitle" : "auth.magic.subtitle", table: "Auth", style: .subheadline)
                    .alignment(.center)
                    .color(Color("TextSecondary"))
            }
            .contentTransition(.opacity)
            .animation(.easeInOut(duration: 0.2), value: didSendLink)

            AppTextField(
                text: $email,
                label: "auth.form.email",
                table: "Auth",
                errorMessage: errorMessage,
                textContentType: .emailAddress,
                autocorrectionDisabled: true,
                submitLabel: .send,
                onSubmit: sendLink
            )

            AppButton(didSendLink ? "auth.magic.resend" : "auth.magic.send", table: "Auth", action: sendLink)
                .fullWidth()
                .loading(isLoading)
                .disabled(!canSend)
                .contentTransition(.opacity)
                .animation(.easeInOut(duration: 0.2), value: didSendLink)

            AppButton("common.cancel", table: "Common", style: .ghost, action: { dismiss() })
                .disabled(isLoading)
        }
        .padding(.top, 88)
        .padding(.horizontal, 24)
        .padding(.bottom, 24)
        .background(Color("BackgroundSecondary"))
    }

    private func sendLink() {
        guard canSend else { return }
        isLoading = true
        errorMessage = nil

        Task {
            defer { isLoading = false }

            do {
                try await env.auth.sendMagicLink(email: email)
                Haptics.success()
                didSendLink = true
            } catch {
                Haptics.error()
                errorMessage = error.localizedDescription
            }
        }
    }
}
