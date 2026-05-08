import SwiftUI

struct IntakeMotivationView: View {
    @Binding var motivationQuote: String
    let isSaving: Bool
    let onContinue: () -> Void

    private let characterCap = 500

    private var trimmed: String {
        motivationQuote.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canContinue: Bool {
        !trimmed.isEmpty && trimmed.count <= characterCap
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                AppText("intake.motivation.title", table: "Intake", style: .title)

                AppText("intake.motivation.subtitle", table: "Intake", style: .subheadline)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 8)
            .padding(.bottom, 16)
            .padding(.leading, 24)
            .padding(.trailing, 76)

            IntakeTextField(
                text: $motivationQuote,
                placeholder: "intake.motivation.placeholder",
                table: "Intake",
                multiline: true
            )
            .padding(.horizontal, 24)

            Spacer()

            AppButton("common.continue", table: "Common", action: onContinue)
                .fullWidth()
                .disabled(!canContinue || isSaving)
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
        }
        .overlay {
            if isSaving {
                ProgressView()
                    .controlSize(.large)
                    .tint(Color("Brand"))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.regularMaterial)
                    .ignoresSafeArea()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: isSaving)
        .appBackground()
    }
}
