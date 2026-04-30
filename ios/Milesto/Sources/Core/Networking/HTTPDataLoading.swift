import Foundation

protocol HTTPDataLoading: Sendable {
    func data(from url: URL) async throws -> Data
}

struct URLSessionDataLoader: HTTPDataLoading {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func data(from url: URL) async throws -> Data {
        let (data, _) = try await session.data(from: url)
        return data
    }
}
