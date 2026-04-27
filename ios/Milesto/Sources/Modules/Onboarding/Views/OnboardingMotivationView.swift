import SwiftUI

struct OnboardingMotivationView: View {
    @Binding var motivationQuote: String
    let isSaving: Bool
    let onContinue: () -> Void
    let onSkip: () -> Void

    private let characterCap = 500

    private var trimmed: String {
        motivationQuote.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canContinue: Bool {
        !trimmed.isEmpty && trimmed.count <= characterCap
    }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText("onboarding.motivation.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.motivation.subtitle", table: "Onboarding", style: .subheadline)
                    .alignment(.center)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)
            .padding(.horizontal, 24)

            AppTextField(
                text: $motivationQuote,
                label: "onboarding.motivation.placeholder",
                table: "Onboarding",
                multiline: true
            )
            .padding(.horizontal, 24)

            Spacer()

            VStack(spacing: 12) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()
                    .disabled(!canContinue || isSaving)

                AppButton("onboarding.motivation.skip", table: "Onboarding", style: .text, action: onSkip)
                    .fullWidth()
                    .disabled(isSaving)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .overlay {
            if isSaving {
                ZStack {
                    Color("TextPrimary").opacity(0.3)
                        .ignoresSafeArea()
                    ProgressView()
                        .tint(Color("TintPrimary"))
                }
            }
        }
    }
}

#Preview {
    OnboardingMotivationView(
        motivationQuote: .constant(""),
        isSaving: false,
        onContinue: {},
        onSkip: {}
    )
}
