import SwiftUI

struct PaywallCTAButton: View {
    let titleKey: LocalizedStringKey
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView()
                        .tint(Color("TextOnAccent"))
                } else {
                    Text(titleKey, tableName: "Paywall")
                        .font(Fonts.ui(size: 17, relativeTo: .headline, weight: .semibold))

                    TablerIcons(.arrowRight, size: 18, color: Color("TextOnAccent"))
                }
            }
            .foregroundStyle(Color("TextOnAccent"))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color("TintPrimary"))
            )
            .opacity(isDisabled ? 0.5 : 1)
        }
        .buttonStyle(PaywallPressStyle())
        .disabled(isLoading || isDisabled)
    }
}

private struct PaywallPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.12), value: configuration.isPressed)
    }
}
