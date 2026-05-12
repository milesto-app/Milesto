import Foundation

@MainActor
@Observable
final class HomeStateViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private var goalId: String = ""

    private(set) var weekState: WeekState = .active
    private(set) var nextWeekStartsAt: Date?
    private(set) var isLoaded = false

    init(env: AppEnv) {
        self.env = env
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        guard !goalId.isEmpty else { return }
        guard let state = try? await env.roadmap.fetchCurrentWeekState(goalId: goalId) else {
            return
        }
        weekState = state.weekState
        nextWeekStartsAt = state.nextWeekStartsAt.flatMap(Self.parseDate)
        isLoaded = true
    }

    private static func parseDate(_ isoDate: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.date(from: isoDate)
    }
}
