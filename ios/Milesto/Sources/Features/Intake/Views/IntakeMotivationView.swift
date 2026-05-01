import SwiftUI

struct IntakeMotivationView: View {
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
                AppText("intake.motivation.title", table: "Intake", style: .title)
                    .alignment(.center)

                AppText("intake.motivation.subtitle", table: "Intake", style: .subheadline)
                    .alignment(.center)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)
            .padding(.horizontal, 24)

            AppTextField(
                text: $motivationQuote,
                label: "intake.motivation.placeholder",
                table: "Intake",
                multiline: true
            )
            .padding(.horizontal, 24)

            Spacer()

            VStack(spacing: 12) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()
                    .disabled(!canContinue || isSaving)

                AppButton("intake.motivation.skip", table: "Intake", style: .text, action: onSkip)
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
                        .tint(Color("Brand"))
                }
            }
        }
    }
}
