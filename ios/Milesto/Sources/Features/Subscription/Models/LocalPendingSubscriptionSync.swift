import Foundation
import SwiftData

@Model
final class PendingSubscriptionSync {
    @Attribute(.unique) var id: UUID
    var jwsRepresentation: String
    var createdAt: Date
    var userId: String?
    var attemptCount: Int

    init(
        id: UUID = UUID(),
        jwsRepresentation: String,
        createdAt: Date = Date(),
        userId: String? = nil,
        attemptCount: Int = 0
    ) {
        self.id = id
        self.jwsRepresentation = jwsRepresentation
        self.createdAt = createdAt
        self.userId = userId
        self.attemptCount = attemptCount
    }
}

typealias LocalPendingSubscriptionSync = PendingSubscriptionSync
