import SwiftUI

struct HomeView: View {
    let goalId: String

    @Environment(AppEnv.self) private var env
    @State private var stateModel: HomeStateViewModel?

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    HomeJourneyCard(goalId: goalId)
                    DebriefBannerCard(goalId: goalId)
                    weeklySection
                        .padding(.top, 8)
                }
                .padding(.bottom, 40)
            }
            .background(Color("BackgroundPrimary"))
        }
        .appBackground()
        .task(id: goalId) {
            if stateModel == nil {
                let vm = HomeStateViewModel(env: env)
                vm.configure(goalId: goalId)
                stateModel = vm
            }
            await stateModel?.refresh()
        }
        .onReceive(NotificationCenter.default.publisher(for: .tasksDidChange)) { _ in
            Task { await stateModel?.refresh() }
        }
    }

    @ViewBuilder
    private var weeklySection: some View {
        if let stateModel, stateModel.isLoaded, stateModel.weekState == .inAdvance {
            HomeInAdvanceCard(nextWeekStartsAt: stateModel.nextWeekStartsAt)
        } else {
            HomeTasksCard(goalId: goalId)
        }
    }
}
