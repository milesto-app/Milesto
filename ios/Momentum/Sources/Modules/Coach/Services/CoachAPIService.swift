import Foundation

final class CoachAPIService {
    static let shared = CoachAPIService()

    private init() {}

    func listCoaches() async throws -> [CoachDTO] {
        try await BackendClient.shared.request(method: "GET", path: "coaches")
    }

    func getCoach(id: Int) async throws -> CoachDTO {
        try await BackendClient.shared.request(method: "GET", path: "coaches/\(id)")
    }
}
