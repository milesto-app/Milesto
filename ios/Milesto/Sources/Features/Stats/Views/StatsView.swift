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
                Color("BackgroundPrimary").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = StatsViewModel(env: env)
            }
            await model?.load(goalId: goalId)
        }
    }

    private func content(model: StatsViewModel) -> some View {
        NavigationStack {
            ZStack {
                if model.isLoading && model.stats == nil {
                    AppLoader(size: 28)
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

    private func loadedContent(model: StatsViewModel, stats: StatsDTO) -> some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
                statsTitle

                VStack(alignment: .leading, spacing: 14) {
                    if let targetDate = model.targetDate {
                        StatsCountdownCard(targetDate: targetDate)
                    }

                    StatsStreakSection(
                        current: stats.streak.current,
                        best: stats.streak.best
                    )

                    StatsActivitySection(days: stats.streak.last7Days)

                    if stats.milestones.total > 0 {
                        StatsMilestonesSection(
                            completed: stats.milestones.completed,
                            total: stats.milestones.total
                        )
                    }
                }
                .padding(.horizontal, 20)
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
            .padding(.bottom, 24)
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
