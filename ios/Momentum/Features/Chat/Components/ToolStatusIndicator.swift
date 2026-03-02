import SwiftUI

struct ToolStatusIndicator: View {
    let toolName: String

    @State private var opacity: Double = 0.4

    private var description: LocalizedStringKey {
        switch toolName {
        case "getDailyObjectives":
            return LocalizedStringKey("chat.tool.dailyObjectives")
        case "getWeeklyPlan":
            return LocalizedStringKey("chat.tool.weeklyPlan")
        case "getMilestones":
            return LocalizedStringKey("chat.tool.milestones")
        default:
            return LocalizedStringKey("chat.tool.dailyObjectives")
        }
    }

    var body: some View {
        HStack {
            AppText(description, table: "Chat", style: .caption)
                .color(AppTheme.Colors.textSecondary)
                .opacity(opacity)
                .onAppear {
                    withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                        opacity = 1.0
                    }
                }
            Spacer()
        }
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.vertical, AppTheme.Spacing.xxs)
    }
}
