import SwiftUI

struct HomeView: View {
    let goalId: String

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    HomeJourneyCard(goalId: goalId)
                    DebriefBannerCard(goalId: goalId)
                    WeeklyTasksCard(goalId: goalId)
                        .padding(.top, 16)
                }
                .padding(.bottom, 40)
            }
            .background(Color("BackgroundBase"))
        }
        .appBackground()
    }
}
