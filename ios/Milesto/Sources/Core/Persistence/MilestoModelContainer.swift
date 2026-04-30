import Foundation
import OSLog
import SwiftData

private let storeLogger = Logger(subsystem: "app.milesto", category: "swiftdata")
private let storeResetGuardKey = "com.milesto.modelContainer.resetAttemptedAtBuild"

enum MilestoModelContainer {
    static func make() -> ModelContainer {
        let schema = Self.schema
        let configuration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .none
        )

        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            return recover(error: error, schema: schema, configuration: configuration)
        }
    }

    private static let schema = Schema([
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

    private static func recover(
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

    private static func deleteStoreFiles(for configuration: ModelConfiguration) {
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

    private static func currentBuildTag() -> String {
        let info = Bundle.main.infoDictionary ?? [:]
        let version = info["CFBundleShortVersionString"] as? String ?? "0"
        let build = info["CFBundleVersion"] as? String ?? "0"
        return "\(version)-\(build)"
    }
}
