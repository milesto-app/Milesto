import SwiftUI

struct IntakeProgressBar: View {
    let current: Int
    let total: Int

    private var progress: Double {
        guard total > 0 else { return 0 }
        return min(max(Double(current) / Double(total), 0), 1)
    }

    var body: some View {
        VStack(spacing: 4) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(AppTheme.Colors.textSecondary.opacity(0.15))
                        .frame(height: 6)

                    Capsule()
                        .fill(AppTheme.Colors.accent)
                        .frame(width: geometry.size.width * progress, height: 6)
                        .animation(.easeInOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: 6)

            HStack {
                Spacer()
                AppText(verbatim: "\(current)/\(total)", style: .caption)
                    .color(AppTheme.Colors.textSecondary)
            }
        }
    }
}
