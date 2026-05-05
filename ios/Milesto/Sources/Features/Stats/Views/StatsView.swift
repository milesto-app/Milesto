import SwiftUI

struct StatsView: View {
    let goalId: String

    @Environment(AppEnv.self) private var env
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
                model = StatsViewModel(repository: env.stats)
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
                    loadedContent(model: model, stats: stats)
                } else if model.loadError != nil {
                    errorView(model: model)
                } else {
                    StatsEmptyState()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .appBackground()
        }
        .appBackground()
    }

    private func loadedContent(model: StatsViewModel, stats: StatsSnapshot) -> some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                statsTitle

                VStack(alignment: .leading, spacing: 28) {
                    StatsHeroSection(
                        completed: stats.overallCompleted,
                        total: stats.overallTotal
                    )

                    StatsThisWeekSection(
                        completed: stats.thisWeekCompleted,
                        total: stats.thisWeekTotal
                    )

                    StatsStreakSection(
                        current: stats.streakCurrent,
                        best: stats.streakBest
                    )

                    StatsActivitySection(days: stats.last7Days)

                    StatsMilestonesSection(
                        completed: stats.milestoneCompleted,
                        total: stats.milestoneTotal
                    )
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 100)
                .opacity(model.hasAppeared ? 1 : 0)
                .offset(y: model.hasAppeared ? 0 : 12)
                .animation(.easeOut(duration: 0.4), value: model.hasAppeared)
            }
        }
    }

    private var statsTitle: some View {
        AppText("stats.title", table: "Stats", style: .largeTitle)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 32)
            .padding(.bottom, 28)
    }

    private func errorView(model: StatsViewModel) -> some View {
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
    }
}
