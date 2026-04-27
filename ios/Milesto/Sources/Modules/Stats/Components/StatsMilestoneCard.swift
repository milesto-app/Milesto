import SwiftUI

struct StatsMilestoneCard: View {
    let completed: Int
    let total: Int
    @State private var isAnimated = false

    private var progress: CGFloat {
        total > 0 ? CGFloat(completed) / CGFloat(total) : 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                TablerIcons(.target, size: 20, color: Color("Brand"))
                AppText("stats.milestones.title", table: "Stats", style: .headline)
                Spacer()
                AppText(verbatim: "\(completed)/\(total)", style: .subheadline)
                    .weight(.semibold)
                    .color(Color("Brand"))
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color("TextSecondary").opacity(0.12))
                    Capsule()
                        .fill(Color("Brand"))
                        .frame(width: geometry.size.width * (isAnimated ? progress : 0))
                        .animation(.spring(duration: 0.8, bounce: 0.15), value: isAnimated)
                }
            }
            .frame(height: 10)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 10), spacing: 6)], alignment: .leading, spacing: 6) {
                ForEach(0 ..< total, id: \.self) { index in
                    Circle()
                        .fill(index < completed ? Color("Brand") : Color("TextSecondary").opacity(0.2))
                        .frame(width: 10, height: 10)
                        .scaleEffect(isAnimated ? 1 : 0.3)
                        .animation(
                            .spring(duration: 0.4, bounce: 0.3).delay(Double(index) * 0.05),
                            value: isAnimated
                        )
                }
            }
        }
        .padding(20)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .onAppear {
            isAnimated = true
        }
    }
}

#Preview {
    StatsMilestoneCard(completed: 3, total: 7)
        .padding(16)
}
