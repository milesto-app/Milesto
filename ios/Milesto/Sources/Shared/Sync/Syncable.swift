import Foundation
import SwiftData

protocol SyncableDTO: Codable, Identifiable, Sendable where ID: Hashable & Sendable {
    var updatedAt: Date { get }
}

protocol Syncable: PersistentModel where ID: Hashable & Sendable, DTO.ID == ID {
    associatedtype DTO: SyncableDTO where DTO.ID == ID

    var updatedAt: Date { get set }
    var syncStatus: SyncStatus { get set }

    static func make(from dto: DTO) -> Self
    func toDTO() -> DTO
    func update(from dto: DTO)
    func regenerateID()
}
