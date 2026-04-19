import Foundation

enum DeepLinkRoute: Equatable {
    case task(id: String)
    case coachReply(id: String)
    case notifWhy(jobId: String, url: URL)
    case unknown

    static func parse(_ url: URL) -> DeepLinkRoute {
        guard url.scheme == "momentum" else { return .unknown }
        let host = url.host ?? ""
        let path = url.pathComponents.filter { $0 != "/" }

        switch (host, path) {
        case let ("task", components) where components.count == 1:
            return .task(id: components[0])
        case let ("coach", components) where components.count == 2 && components[0] == "reply":
            return .coachReply(id: components[1])
        case let ("notif", components) where components.count == 2 && components[0] == "why":
            return .notifWhy(jobId: components[1], url: url)
        default:
            return .unknown
        }
    }
}
