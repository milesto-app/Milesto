import SwiftUI

struct HomeView: View {
    let goalId: String

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    HomeJourneyCard(goalId: goalId)
                    DebriefBannerCard(goalId: goalId)
                    HomeWeeklyTasksCard(goalId: goalId)
                        .padding(.top, 16)
                }
                .padding(.bottom, 40)
            }
            .background(Color("BackgroundPrimary"))
        }
        .appBackground()
    }
}
