import SwiftUI

private struct PressableCardStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct CoachCard: View {
    let personality: CoachPersonality
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: AppTheme.Spacing.md) {
                ZStack {
                    Circle()
                        .fill(AppTheme.Colors.accent.opacity(0.1))
                        .frame(width: 56, height: 56)

                    TablerIcon(personality.icon, size: 28, color: AppTheme.Colors.accent)
                }

                VStack(alignment: .leading, spacing: AppTheme.Spacing.xxs) {
                    AppText(verbatim: personality.title, style: .headline)

                    AppText(verbatim: personality.description, style: .subheadline)
                }

                Spacer()

                TablerIcon(.circleCheck, size: 28, color: AppTheme.Colors.accent)
                    .opacity(isSelected ? 1 : 0)
                    .scaleEffect(isSelected ? 1 : 0.5)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
            }
            .padding(AppTheme.Spacing.md)
            .contentShape(Rectangle())
            .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                    .stroke(AppTheme.Colors.accent, lineWidth: 2)
                    .opacity(isSelected ? 1 : 0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
            )
        }
        .buttonStyle(PressableCardStyle())
    }
}

#Preview {
    VStack(spacing: AppTheme.Spacing.md) {
        CoachCard(
            personality: .motivateur,
            isSelected: true,
            onSelect: {}
        )

        CoachCard(
            personality: .zen,
            isSelected: false,
            onSelect: {}
        )
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
