import SwiftData
import SwiftUI

@main
struct AppMain: App {
    @UIApplicationDelegateAdaptor(PushNotificationDelegate.self) private var pushDelegate
    let container: ModelContainer = AppMain.makeContainer()

    var body: some Scene {
        WindowGroup {
            AppView()
        }
        .modelContainer(container)
        .environment(AppEnv(container: container))
    }

    private static func makeContainer() -> ModelContainer {
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
            LocalPendingSubscriptionSync.self,
        ])

        do {
            return try ModelContainer(for: schema)
        } catch {
            removeDefaultStoreFiles()
            do {
                return try ModelContainer(for: schema)
            } catch {
                fatalError("ModelContainer init failed after store reset: \(error)")
            }
        }
    }

    private static func removeDefaultStoreFiles() {
        let fileManager = FileManager.default
        guard let appSupport = try? fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: false
        ) else { return }

        for name in ["default.store", "default.store-wal", "default.store-shm"] {
            try? fileManager.removeItem(at: appSupport.appendingPathComponent(name))
        }
    }
}
