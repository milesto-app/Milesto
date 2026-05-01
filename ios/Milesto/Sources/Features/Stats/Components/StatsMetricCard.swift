import SwiftUI

struct StatsMetricCard: View {
    let icon: TablerIconOutline
    let value: String
    let label: LocalizedStringKey
    let table: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            TablerIcons(icon, size: 20, color: Color("Brand"))

            AppText(verbatim: value, style: .title)
                .weight(.bold)

            AppText(label, table: table, style: .caption)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 16))
    }
}
