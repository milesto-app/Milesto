import OSLog
import SwiftData
import SwiftUI
import UIKit

private let storeLogger = Logger(subsystem: "app.milesto", category: "swiftdata")
private let storeResetGuardKey = "com.milesto.modelContainer.resetAttemptedAtBuild"

@main
struct MilestoApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var authService = SupabaseAuthRepository.shared
    @State private var dependencies = AppDependencies(
        auth: SupabaseAuthRepository.shared,
        entitlement: SyncingSubscriptionRepository.shared
    )
    @Environment(\.scenePhase) private var scenePhase

    private var isAuthenticated: Bool {
        if case .authenticated = authService.authState { return true }
        return false
    }

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Profile.self,
            Goal.self,
            LocalRoadmap.self,
            LocalMilestone.self,
            LocalWeeklyPlan.self,
            LocalWeeklyTask.self,
            LocalDebrief.self,
            LocalConversation.self,
            LocalChatMessage.self,
            LocalStats.self,
            PendingSubscriptionSync.self,
        ])
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .none
        )

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            return recoverModelContainer(error: error, schema: schema, configuration: modelConfiguration)
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(Color("Brand"))
                .environment(authService)
                .environment(dependencies)
                .onOpenURL { url in
                    Task {
                        await authService.handleDeepLink(url)
                    }
                }
                .task(id: isAuthenticated) {
                    await SubscriptionSyncOutbox.shared.configure(container: sharedModelContainer)
                    guard isAuthenticated else { return }
                    await NotificationService.shared.requestPermissionAndRegister()
                    await SyncingSubscriptionRepository.shared.onAppStart()
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active, isAuthenticated {
                        Task {
                            await NotificationService.shared.requestPermissionAndRegister()
                        }
                    }
                }
        }
        .modelContainer(sharedModelContainer)
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { await NotificationService.shared.registerToken(deviceToken) }
    }

    func application(
        _: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError _: Error
    ) {}
}

private func recoverModelContainer(
    error: Error,
    schema: Schema,
    configuration: ModelConfiguration
) -> ModelContainer {
    let nsError = error as NSError
    storeLogger.error(
        "ModelContainer init failed: domain=\(nsError.domain, privacy: .public) code=\(nsError.code) description=\(nsError.localizedDescription, privacy: .public)"
    )

    let buildTag = currentBuildTag()
    let alreadyResetForThisBuild = UserDefaults.standard.string(forKey: storeResetGuardKey) == buildTag
    if alreadyResetForThisBuild {
        fatalError("ModelContainer init failed again after reset for build \(buildTag): \(error)")
    }

    storeLogger.notice("Wiping local SwiftData store to recover from container init failure (build \(buildTag, privacy: .public))")
    deleteStoreFiles(for: configuration)
    UserDefaults.standard.set(buildTag, forKey: storeResetGuardKey)

    do {
        return try ModelContainer(for: schema, configurations: [configuration])
    } catch {
        fatalError("Could not create ModelContainer after reset: \(error)")
    }
}

private func deleteStoreFiles(for configuration: ModelConfiguration) {
    let storeURL = configuration.url
    let directory = storeURL.deletingLastPathComponent()
    let storeName = storeURL.lastPathComponent
    let sidecars = [
        storeURL,
        directory.appendingPathComponent("\(storeName)-wal"),
        directory.appendingPathComponent("\(storeName)-shm"),
    ]
    for url in sidecars {
        do {
            try FileManager.default.removeItem(at: url)
        } catch CocoaError.fileNoSuchFile {
            continue
        } catch {
            storeLogger.error("Failed to remove \(url.lastPathComponent, privacy: .public): \(error.localizedDescription, privacy: .public)")
        }
    }
}

private func currentBuildTag() -> String {
    let info = Bundle.main.infoDictionary ?? [:]
    let version = info["CFBundleShortVersionString"] as? String ?? "0"
    let build = info["CFBundleVersion"] as? String ?? "0"
    return "\(version)-\(build)"
}
