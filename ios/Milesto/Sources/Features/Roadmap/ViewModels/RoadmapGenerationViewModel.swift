import Foundation
import OSLog

private let logger = Logger(subsystem: "app.milesto", category: "RoadmapGeneration")

@MainActor
@Observable
final class RoadmapGenerationViewModel {
    @ObservationIgnored private let repository: RoadmapRepository

    private(set) var isGenerating = false
    private(set) var hasFailed = false

    init(repository: RoadmapRepository) {
        self.repository = repository
    }

    func generate(goalId: String) async -> Bool {
        hasFailed = false
        isGenerating = true

        do {
            try await repository.generateRoadmap(goalId: goalId)
        } catch {
            if let apiError = error as? ApiError,
               case .httpError(statusCode: 409, _) = apiError
            {
            } else {
                logger.error("Generate roadmap call failed: \(error)")
                hasFailed = true
                isGenerating = false
                return false
            }
        }

        for _ in 0 ..< 60 {
            try? await Task.sleep(for: .seconds(3))
            do {
                let status = try await repository.fetchRoadmapStatus(goalId: goalId)
                if status == .complete {
                    isGenerating = false
                    return true
                } else if status == .failed {
                    hasFailed = true
                    isGenerating = false
                    return false
                }
            } catch {
                logger.error("Roadmap poll failed: \(error)")
            }
        }

        hasFailed = true
        isGenerating = false
        return false
    }
}
