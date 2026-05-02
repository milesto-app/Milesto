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
                if model.isLoading && model.stats == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let stats = model.stats {
                    GeometryReader { proxy in
                        ScrollView(.vertical, showsIndicators: false) {
                            VStack(spacing: 12) {
                                statsContent(model: model, stats: stats)
                            }
                            .frame(width: max(0, proxy.size.width - 40))
                            .padding(.horizontal, 20)
                            .padding(.top, 16)
                            .padding(.bottom, 100)
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
            .appBackground()
        }
        .appBackground()
    }

    @ViewBuilder
    private func statsContent(model: StatsViewModel, stats: StatsSnapshot) -> some View {
        StatsHeroCard(
            completedCount: stats.overallCompleted,
            totalCount: stats.overallTotal,
            rate: stats.overallRate
        )
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)
        .padding(.bottom, 12)

        StatsWeeklyChart(days: stats.last7Days)
            .opacity(model.hasAppeared ? 1 : 0)
            .offset(y: model.hasAppeared ? 0 : 12)

        StatsProgressRing(
            rate: stats.thisWeekRate,
            completed: stats.thisWeekCompleted,
            total: stats.thisWeekTotal
        )
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)

        HStack(spacing: 12) {
            StatsMetricCard(
                icon: .flame,
                value: "\(stats.streakCurrent)",
                label: "stats.metrics.streak",
                table: "Stats"
            )
            StatsMetricCard(
                icon: .trophy,
                value: "\(stats.streakBest)",
                label: "stats.streak.best",
                table: "Stats"
            )
        }
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)

        StatsMilestoneCard(
            completed: stats.milestoneCompleted,
            total: stats.milestoneTotal
        )
        .opacity(model.hasAppeared ? 1 : 0)
        .offset(y: model.hasAppeared ? 0 : 12)
    }
}
