import Combine
import Foundation

@MainActor
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()

    @Published var pendingRoute: DeepLinkRoute?

    private init() {}

    func handle(_ url: URL) -> Bool {
        let route = DeepLinkRoute.parse(url)
        guard route != .unknown else { return false }
        pendingRoute = route
        return true
    }

    func consume() -> DeepLinkRoute? {
        let route = pendingRoute
        pendingRoute = nil
        return route
    }
}
