import SwiftData
import SwiftUI

struct StatsView: View {
    let goalId: String

    @Environment(\.modelContext) private var modelContext
    @State private var stats: StatsDTO?
    @State private var isLoading = true
    @State private var hasAppeared = false
    @State private var loadError: Error?

    var body: some View {
        NavigationStack {
            ZStack {
                if isLoading && stats == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let stats {
                    GeometryReader { proxy in
                        ScrollView(.vertical, showsIndicators: false) {
                            VStack(spacing: 12) {
                                statsContent(stats)
                            }
                            .frame(width: proxy.size.width - 40)
                            .padding(.horizontal, 20)
                            .padding(.top, 16)
                            .padding(.bottom, 100)
                        }
                        .hapticRefreshable {
                            await loadStats()
                        }
                    }
                } else if loadError != nil {
                    VStack(spacing: 24) {
                        TablerIcons(.wifiOff, size: 48, color: Color("TextSecondary"))

                        AppText("stats.error.title", table: "Stats", style: .title)
                            .alignment(.center)

                        AppText(verbatim: loadError?.localizedDescription ?? "", style: .caption)
                            .color(Color("TextSecondary"))
                            .alignment(.center)

                        AppButton("stats.error.retry", table: "Stats") {
                            Task { await loadStats() }
                        }
                    }
                    .padding(32)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    StatsEmptyState()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .task {
                await loadStats()
            }
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
        .padding(.bottom, 12)

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

        if stats == nil, let cached = fetchCachedStats() {
            stats = cached
            isLoading = false
            if !hasAppeared {
                withAnimation(.easeOut(duration: 0.5)) {
                    hasAppeared = true
                }
            }
        }

        do {
            let result = try await StatsAPIService.shared.getStats(goalId: goalId)
            stats = result
            syncStatsToCache(result)
            isLoading = false
            if !hasAppeared {
                withAnimation(.easeOut(duration: 0.5)) {
                    hasAppeared = true
                }
            }
        } catch {
            if stats == nil {
                loadError = error
            }
            isLoading = false
        }
    }

    private func fetchCachedStats() -> StatsDTO? {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let local = try? modelContext.fetch(descriptor).first,
              let data = local.statsJSON else { return nil }
        return try? JSONDecoder().decode(StatsDTO.self, from: data)
    }

    private func syncStatsToCache(_ dto: StatsDTO) {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let data = try? JSONEncoder().encode(dto)

        if let existing = try? modelContext.fetch(descriptor).first {
            existing.statsJSON = data
            existing.updatedAt = Date()
        } else {
            modelContext.insert(LocalStats(goalId: goalId, statsJSON: data))
        }
    }
}

#Preview {
    StatsView(goalId: "preview-goal")
}
