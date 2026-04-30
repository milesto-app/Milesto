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
                        .tint(Color("TextOnBrand"))
                } else {
                    AppText(titleKey, table: "Paywall", style: .headline)
                        .weight(.semibold)

                    TablerIcons(.arrowRight, size: 18, color: Color("TextOnBrand"))
                }
            }
            .foregroundStyle(Color("TextOnBrand"))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color("Brand"))
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
