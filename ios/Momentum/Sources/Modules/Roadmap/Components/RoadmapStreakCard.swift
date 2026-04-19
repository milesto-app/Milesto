import Supabase
import SwiftUI

struct RoadmapStreakCard: View {
    let goalId: String

    @State private var currentWeeks: Int = 0
    @State private var longestWeeks: Int = 0
    @State private var freezeTokens: Int = 0
    @State private var isLoading: Bool = true

    var body: some View {
        HStack(spacing: 16) {
            streakMetric(
                icon: .flame,
                value: String(currentWeeks),
                labelKey: "roadmap.streak.current"
            )
            Divider()
                .frame(height: 32)
                .background(Color("TextSecondary").opacity(0.2))
            streakMetric(
                icon: .trophy,
                value: String(longestWeeks),
                labelKey: "roadmap.streak.longest"
            )
            Divider()
                .frame(height: 32)
                .background(Color("TextSecondary").opacity(0.2))
            streakMetric(
                icon: .snowflake,
                value: String(freezeTokens),
                labelKey: "roadmap.streak.freezes"
            )
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(Color("BgSurface"))
        .cornerRadius(12)
        .padding(.horizontal, 24)
        .padding(.bottom, 16)
        .opacity(isLoading ? 0 : 1)
        .animation(.easeOut(duration: 0.3), value: isLoading)
        .task(id: goalId) {
            await loadStreak()
        }
    }

    private func streakMetric(
        icon: TablerIconOutline,
        value: String,
        labelKey: String
    ) -> some View {
        VStack(spacing: 4) {
            HStack(spacing: 6) {
                TablerIcon(icon, size: 16, color: Color("TintPrimary"))
                AppText(verbatim: value, style: .headline)
                    .weight(.semibold)
            }
            AppText(labelKey, table: "Roadmap", style: .caption)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity)
    }

    private func loadStreak() async {
        do {
            let response: [UserStreakRow] = try await Supabase.client
                .from("user_streaks")
                .select("current_weeks,longest_weeks,freeze_tokens")
                .eq("goal_id", value: goalId)
                .limit(1)
                .execute()
                .value
            await MainActor.run {
                if let row = response.first {
                    currentWeeks = row.currentWeeks
                    longestWeeks = row.longestWeeks
                    freezeTokens = row.freezeTokens
                }
                isLoading = false
            }
        } catch {
            await MainActor.run { isLoading = false }
        }
    }
}

private struct UserStreakRow: Decodable {
    let currentWeeks: Int
    let longestWeeks: Int
    let freezeTokens: Int

    enum CodingKeys: String, CodingKey {
        case currentWeeks = "current_weeks"
        case longestWeeks = "longest_weeks"
        case freezeTokens = "freeze_tokens"
    }
}
