import Foundation

protocol SyncableRemote: Sendable {
    associatedtype DTO: SyncableDTO

    func fetchAll() async throws -> [DTO]
    func upsert(_ dto: DTO) async throws -> DTO
    func delete(id: DTO.ID) async throws
}
