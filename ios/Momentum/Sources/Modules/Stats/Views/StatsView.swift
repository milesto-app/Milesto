import SwiftUI

struct StatsView: View {
    let goalId: String

    @State private var stats: StatsDTO?
    @State private var isLoading = true
    @State private var hasAppeared = false
    @State private var loadError: Error?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                AnimatedBackground()

                if isLoading && stats == nil {
                    ProgressView()
                        .frame(maxHeight: .infinity)
                } else if let stats {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 16) {
                            statsContent(stats)
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 32)
                        .padding(.bottom, 40)
                    }
                    .hapticRefreshable {
                        await loadStats()
                    }
                } else if loadError != nil {
                    VStack(spacing: 24) {
                        TablerIcons(.wifiOff, size: 48, color: Colors.textSecondary)

                        AppText("stats.error.title", table: "Stats", style: .title)
                            .alignment(.center)

                        AppText(verbatim: loadError?.localizedDescription ?? "", style: .caption)
                            .color(Colors.textSecondary)
                            .alignment(.center)

                        AppButton("stats.error.retry", table: "Stats") {
                            Task { await loadStats() }
                        }
                    }
                    .padding(32)
                    .frame(maxHeight: .infinity)
                } else {
                    StatsEmptyState()
                        .frame(maxHeight: .infinity)
                }
            }
        }
        .task {
            await loadStats()
        }
    }

    @ViewBuilder
    private func statsContent(_ stats: StatsDTO) -> some View {
        StatsHeroCard(
            completedCount: stats.completion.totalCompleted,
            totalCount: stats.completion.totalObjectives,
            rate: stats.completion.overallRate
        )
        .opacity(hasAppeared ? 1 : 0)
        .offset(y: hasAppeared ? 0 : 12)

        StatsWeeklyChart(days: stats.streak.last7Days)
            .opacity(hasAppeared ? 1 : 0)
            .offset(y: hasAppeared ? 0 : 12)

        StatsProgressRing(
            rate: stats.completion.thisWeekRate,
            completed: thisWeekCompleted(stats),
            total: thisWeekTotal(stats)
        )
        .opacity(hasAppeared ? 1 : 0)
        .offset(y: hasAppeared ? 0 : 12)

        HStack(spacing: 12) {
            StatsMetricCard(
                icon: .flame,
                value: "\(stats.streak.current)",
                label: "stats.metrics.streak",
                table: "Stats"
            )
            StatsMetricCard(
                icon: .trophy,
                value: "\(stats.streak.best)",
                label: "stats.streak.best",
                table: "Stats"
            )
        }
        .opacity(hasAppeared ? 1 : 0)
        .offset(y: hasAppeared ? 0 : 12)

        StatsEnergyCard(distribution: stats.energy.distribution)
            .opacity(hasAppeared ? 1 : 0)
            .offset(y: hasAppeared ? 0 : 12)

        StatsMilestoneCard(
            completed: stats.milestones.completed,
            total: stats.milestones.total
        )
        .opacity(hasAppeared ? 1 : 0)
        .offset(y: hasAppeared ? 0 : 12)
    }

    private func thisWeekCompleted(_ stats: StatsDTO) -> Int {
        guard let current = stats.weeklyProgress.last else {
            return Int(stats.completion.thisWeekRate * Double(stats.completion.totalObjectives))
        }
        return current.objectivesCompleted
    }

    private func thisWeekTotal(_ stats: StatsDTO) -> Int {
        guard let current = stats.weeklyProgress.last else {
            return stats.completion.totalObjectives
        }
        return current.objectivesTotal
    }

    private func loadStats() async {
        loadError = nil
        do {
            let result = try await StatsAPIService.shared.getStats(goalId: goalId)
            stats = result
            isLoading = false
            if !hasAppeared {
                withAnimation(.easeOut(duration: 0.5)) {
                    hasAppeared = true
                }
            }
        } catch {
            loadError = error
            isLoading = false
        }
    }
}

#Preview {
    StatsView(goalId: "preview-goal")
}
