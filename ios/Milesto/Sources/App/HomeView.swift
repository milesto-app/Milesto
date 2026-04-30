import SwiftUI

struct HomeView: View {
    let goalId: String

    @State private var refreshToken = 0

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    CurrentFocusCard(goalId: goalId, refreshToken: refreshToken)
                    DebriefBannerCard(goalId: goalId, refreshToken: refreshToken)
                    WeeklyTasksCard(goalId: goalId, refreshToken: refreshToken)
                }
                .padding(.bottom, 40)
            }
            .hapticRefreshable {
                refreshToken += 1
            }
        }
    }
}
