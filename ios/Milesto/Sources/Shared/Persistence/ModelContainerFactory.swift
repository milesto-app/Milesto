import CryptoKit
import Foundation
import SwiftData

enum ModelContainerFactory {
    private static let fingerprintKey = "ModelSchemaFingerprint"

    static func make() -> ModelContainer {
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

        wipeIfSchemaChanged(schema: schema)

        do {
            return try ModelContainer(for: schema)
        } catch {
            wipeStoreFiles()
            do {
                return try ModelContainer(for: schema)
            } catch {
                fatalError("Could not create ModelContainer after wipe: \(error)")
            }
        }
    }

    private static func wipeIfSchemaChanged(schema: Schema) {
        let current = fingerprint(of: schema)
        let stored = UserDefaults.standard.string(forKey: fingerprintKey)
        guard current != stored else { return }
        wipeStoreFiles()
        UserDefaults.standard.set(current, forKey: fingerprintKey)
    }

    private static func fingerprint(of schema: Schema) -> String {
        let description = String(describing: schema)
        let hash = SHA256.hash(data: Data(description.utf8))
        return hash.map { String(format: "%02x", $0) }.joined()
    }

    private static func wipeStoreFiles() {
        let support = URL.applicationSupportDirectory
        let names = ["default.store", "default.store-shm", "default.store-wal"]
        for name in names {
            try? FileManager.default.removeItem(at: support.appending(component: name))
        }
    }
}
