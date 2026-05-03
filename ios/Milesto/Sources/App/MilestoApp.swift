import SwiftData
import SwiftUI

@main
struct MilestoApp: App {
    let container = try! ModelContainer(for: Schema([
        LocalProfile.self,
        LocalGoal.self,
        LocalRoadmap.self,
        LocalMilestone.self,
        LocalWeeklyPlan.self,
        LocalWeeklyTask.self,
        LocalDebrief.self,
        LocalConversation.self,
        LocalChatMessage.self,
        LocalStats.self,
        LocalPendingSubscriptionSync.self,
    ]))

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(AppDependencies(container: container))
        }
        .modelContainer(container)
    }
}
