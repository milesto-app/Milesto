import Foundation

enum MilestoneStatus {
    case completed
    case current
    case upcoming
}

struct MockMilestone: Identifiable {
    let id = UUID()
    let title: String
    let description: String
    let targetDate: Date
    let status: MilestoneStatus
    let progress: Double
    var isKeyMilestone: Bool = false
}

enum RoadmapPreviewData {
    static let goalTitle = String(localized: "roadmap.mock.goalTitle", table: "Roadmap")
    static let goalProgress: Double = 0.35
    static let daysRemaining = 142
    static let deadline = Calendar.current.date(byAdding: .day, value: 142, to: Date())!
    static let startDate = Calendar.current.date(byAdding: .day, value: -78, to: Date())!

    static let milestones: [MockMilestone] = [
        MockMilestone(
            title: String(localized: "roadmap.mock.milestone1.title", table: "Roadmap"),
            description: String(localized: "roadmap.mock.milestone1.description", table: "Roadmap"),
            targetDate: Calendar.current.date(byAdding: .day, value: -60, to: Date())!,
            status: .completed,
            progress: 1.0
        ),
        MockMilestone(
            title: String(localized: "roadmap.mock.milestone2.title", table: "Roadmap"),
            description: String(localized: "roadmap.mock.milestone2.description", table: "Roadmap"),
            targetDate: Calendar.current.date(byAdding: .day, value: -30, to: Date())!,
            status: .completed,
            progress: 1.0
        ),
        MockMilestone(
            title: String(localized: "roadmap.mock.milestone3.title", table: "Roadmap"),
            description: String(localized: "roadmap.mock.milestone3.description", table: "Roadmap"),
            targetDate: Calendar.current.date(byAdding: .day, value: -5, to: Date())!,
            status: .completed,
            progress: 1.0
        ),
        MockMilestone(
            title: String(localized: "roadmap.mock.milestone4.title", table: "Roadmap"),
            description: String(localized: "roadmap.mock.milestone4.description", table: "Roadmap"),
            targetDate: Calendar.current.date(byAdding: .day, value: 20, to: Date())!,
            status: .current,
            progress: 0.6,
            isKeyMilestone: true
        ),
        MockMilestone(
            title: String(localized: "roadmap.mock.milestone5.title", table: "Roadmap"),
            description: String(localized: "roadmap.mock.milestone5.description", table: "Roadmap"),
            targetDate: Calendar.current.date(byAdding: .day, value: 60, to: Date())!,
            status: .upcoming,
            progress: 0.0
        ),
        MockMilestone(
            title: String(localized: "roadmap.mock.milestone6.title", table: "Roadmap"),
            description: String(localized: "roadmap.mock.milestone6.description", table: "Roadmap"),
            targetDate: Calendar.current.date(byAdding: .day, value: 100, to: Date())!,
            status: .upcoming,
            progress: 0.0
        ),
        MockMilestone(
            title: String(localized: "roadmap.mock.milestone7.title", table: "Roadmap"),
            description: String(localized: "roadmap.mock.milestone7.description", table: "Roadmap"),
            targetDate: Calendar.current.date(byAdding: .day, value: 142, to: Date())!,
            status: .upcoming,
            progress: 0.0,
            isKeyMilestone: true
        ),
    ]

    static func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "d MMM"
        return formatter.string(from: date)
    }

    static func relativeDays(_ date: Date) -> Int {
        Calendar.current.dateComponents([.day], from: Date(), to: date).day ?? 0
    }
}
