import SwiftUI

struct PaywallPlanCard: View {
    let titleKey: LocalizedStringKey
    let price: String
    let periodKey: LocalizedStringKey
    let footnoteKey: LocalizedStringKey?
    let badgeKey: LocalizedStringKey?
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 8) {
                AppText(titleKey, table: "Paywall", style: .subheadline)
                    .weight(.semibold)
                    .color(Color("TextSecondary"))

                AppText(verbatim: price, style: .title)
                    .weight(.semibold)

                AppText(periodKey, table: "Paywall", style: .caption)
                    .color(Color("TextSecondary"))

                if let footnoteKey {
                    Spacer(minLength: 4)
                    HStack(spacing: 6) {
                        TablerIcons(.gift, size: 12, color: Color("Brand"))
                        AppText(footnoteKey, table: "Paywall", style: .caption)
                            .color(Color("Brand"))
                            .weight(.semibold)
                    }
                } else {
                    Spacer(minLength: 4)
                    Color.clear.frame(height: 14)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 160, alignment: .topLeading)
            .contentShape(Rectangle())
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color("Brand"), lineWidth: 2)
                    .opacity(isSelected ? 1 : 0)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color("TextSecondary").opacity(0.15), lineWidth: 1)
                    .opacity(isSelected ? 0 : 1)
            )
            .overlay(alignment: .topTrailing) {
                if let badgeKey {
                    AppPill(badgeKey, table: "Paywall", tint: Color("Brand"), icon: .gift)
                        .background(Capsule().fill(Color("BackgroundPrimary")))
                        .offset(x: 8, y: -10)
                }
            }
            .scaleEffect(isSelected ? 1.0 : 0.98)
            .animation(.spring(response: 0.35, dampingFraction: 0.8), value: isSelected)
        }
        .buttonStyle(.plain)
    }
}
