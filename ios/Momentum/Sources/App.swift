import SwiftData
import SwiftUI

@main
struct MomentumApp: App {
    @StateObject private var authService = AuthService.shared
    @StateObject private var storeService = StoreService.shared

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
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
            Group {
                switch authService.authState {
                case .authenticating:
                    ProgressView()
                case let .authenticated(userId):
                    ProfileGateView(userId: userId)
                case .unauthenticated, .error:
                    AuthContainerView()
                }
            }
            .tint(Color("TintPrimary"))
            .environmentObject(authService)
            .environmentObject(storeService)
            .onOpenURL { url in
                Task {
                    await authService.handleDeepLink(url)
                }
            }
        }
        .modelContainer(sharedModelContainer)
    }
}
