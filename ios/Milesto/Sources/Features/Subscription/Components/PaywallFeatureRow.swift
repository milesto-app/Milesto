import SwiftUI

struct PaywallFeatureRow: View {
    let icon: TablerIconOutline
    let labelKey: LocalizedStringKey

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color("Brand").opacity(0.12))
                    .frame(width: 36, height: 36)
                TablerIcons(icon, size: 18, color: Color("Brand"))
            }

            AppText(labelKey, table: "Paywall", style: .body)
                .weight(.medium)
                .lineLimit(1)

            Spacer(minLength: 0)

            TablerIcons(.check, size: 18, color: Color("Brand"))
                .opacity(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
