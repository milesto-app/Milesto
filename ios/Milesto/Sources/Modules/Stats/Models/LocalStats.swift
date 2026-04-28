import Foundation
import SwiftData

@Model
final class LocalStats {
    @Attribute(.unique) var goalId: String
    var statsJSON: Data?
    var updatedAt: Date

    init(goalId: String, statsJSON: Data?, updatedAt: Date = Date()) {
        self.goalId = goalId
        self.statsJSON = statsJSON
        self.updatedAt = updatedAt
    }
}
