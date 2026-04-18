import SwiftData
import SwiftUI

@main
struct MomentumApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authService = AuthService.shared
    @Environment(\.scenePhase) private var scenePhase

    private var isAuthenticated: Bool {
        if case .authenticated = authService.authState { return true }
        return false
    }

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
                    PaywallGateView {
                        ProfileGateView(userId: userId)
                    }
                case .unauthenticated, .error:
                    AuthContainerView()
                }
            }
            .tint(Color("TintPrimary"))
            .environmentObject(authService)
            .onOpenURL { url in
                Task {
                    await authService.handleDeepLink(url)
                }
            }
            .task(id: isAuthenticated) {
                guard isAuthenticated else { return }
                await NotificationService.shared.requestPermissionAndRegister()
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active, isAuthenticated {
                    Task { await NotificationService.shared.requestPermissionAndRegister() }
                }
            }
        }
        .modelContainer(sharedModelContainer)
    }
}
