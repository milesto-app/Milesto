import Foundation

struct UsageStatus: Decodable {
    let used: Int
    let limit: Int
    let isPro: Bool
    let resetsAt: String
}

@MainActor
final class UsageService: ObservableObject {
    static let shared = UsageService()

    @Published private(set) var usage: UsageStatus?
    @Published private(set) var isLoading = false

    private init() {}

    func fetchUsage() async {
        isLoading = true
        do {
            let status: UsageStatus = try await BackendClient.shared.request(
                method: "GET",
                path: "usage"
            )
            usage = status
        } catch {
            usage = nil
        }
        isLoading = false
    }
}
