import Foundation
import SwiftData

@MainActor
final class RoadmapLocalDataPurger: LocalDataPurging {
    private let container: ModelContainer

    init(container: ModelContainer) {
        self.container = container
    }

    func purgeLocalData() throws {
        let context = container.mainContext
        try deleteAll(LocalDebrief.self, in: context)
        try deleteAll(LocalWeeklyTask.self, in: context)
        try deleteAll(LocalWeeklyPlan.self, in: context)
        try deleteAll(LocalMilestone.self, in: context)
        try deleteAll(LocalRoadmap.self, in: context)
        try context.save()
    }

    private func deleteAll<T: PersistentModel>(_: T.Type, in context: ModelContext) throws {
        let descriptor = FetchDescriptor<T>()
        let rows = try context.fetch(descriptor)
        for row in rows {
            context.delete(row)
        }
    }
}
