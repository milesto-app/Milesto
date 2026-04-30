import SwiftUI

struct StatsView: View {
    let goalId: String

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: StatsViewModel?

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = StatsViewModel(repository: dependencies.stats)
            }
            await model?.load(goalId: goalId)
        }
    }

    private func content(model: StatsViewModel) -> some View {
        NavigationStack {
            ZStack {
                if model.isLoading && model.statsDTO == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let stats = model.statsDTO {
                    GeometryReader { proxy in
                        ScrollView(.vertical, showsIndicators: false) {
                            VStack(spacing: 12) {
                                statsContent(model: model, stats: stats)
                            }
                            .frame(width: proxy.size.width - 40)
                            .padding(.horizontal, 20)
                            .padding(.top, 16)
                            .padding(.bottom, 100)
                        }
                        .hapticRefreshable {
                            await model.load(goalId: goalId)
                        }
                    }
                } else if model.loadError != nil {
                    VStack(spacing: 24) {
                        TablerIcons(.wifiOff, size: 48, color: Color("TextSecondary"))

                        AppText("stats.error.title", table: "Stats", style: .title)
                            .alignment(.center)

                        AppText(verbatim: model.loadError?.localizedDescription ?? "", style: .caption)
                            .color(Color("TextSecondary"))
                            .alignment(.center)

                        AppButton("stats.error.retry", table: "Stats") {
                            Task { await model.load(goalId: goalId) }
                        }
                    }
                    .padding(32)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    StatsEmptyState()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
    }

    @ViewBuilder
    private func statsContent(model: StatsViewModel, stats: StatsDTO) -> some View {
        StatsHeroCard(
            completedCount: stats.completion.totalCompleted,
            totalCount: stats.completion.totalObjectives,
            rate: stats.completion.overallRate
        )
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)
        .padding(.bottom, 12)

        StatsWeeklyChart(days: stats.streak.last7Days)
            .opacity(model.hasAppeared ? 1 : 0)
            .offset(y: model.hasAppeared ? 0 : 12)

        StatsProgressRing(
            rate: stats.completion.thisWeekRate,
            completed: thisWeekCompleted(stats),
            total: thisWeekTotal(stats)
        )
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)

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
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)

        StatsMilestoneCard(
            completed: stats.milestones.completed,
            total: stats.milestones.total
        )
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)
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
}
