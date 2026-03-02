import SwiftData
import SwiftUI

@main
struct MomentumApp: App {
    @StateObject private var authService = AuthService.shared

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            LocalProfile.self,
            LocalGoal.self,
            LocalRoadmap.self,
            LocalMilestone.self,
            LocalWeeklyPlan.self,
            LocalDailyObjective.self,
            LocalCheckIn.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authService)
                .onOpenURL { url in
                    Task {
                        await authService.handleDeepLink(url)
                    }
                }
        }
        .modelContainer(sharedModelContainer)
    }
}
