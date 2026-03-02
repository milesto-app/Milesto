import Foundation

struct MockGoal {
    let title: String
    let description: String
    let deadline: Date
    let progress: Double
    let daysRemaining: Int
    let daysElapsed: Int
}

struct MockTask: Identifiable {
    let id = UUID()
    let title: String
    var isCompleted: Bool
}

enum HomePreviewData {
    static let goal = MockGoal(
        title: String(localized: "home.mock.goalTitle", table: "Home"),
        description: String(localized: "home.mock.goalDescription", table: "Home"),
        deadline: Calendar.current.date(byAdding: .day, value: 142, to: Date())!,
        progress: 0.35,
        daysRemaining: 142,
        daysElapsed: 78
    )

    static var tasks: [MockTask] {
        [
            MockTask(title: String(localized: "home.mock.task1", table: "Home"), isCompleted: true),
            MockTask(title: String(localized: "home.mock.task2", table: "Home"), isCompleted: true),
            MockTask(title: String(localized: "home.mock.task3", table: "Home"), isCompleted: false),
            MockTask(title: String(localized: "home.mock.task4", table: "Home"), isCompleted: false),
            MockTask(title: String(localized: "home.mock.task5", table: "Home"), isCompleted: false),
        ]
    }

    static let firstName = "Maty"

    static var completedCount: Int {
        tasks.filter(\.isCompleted).count
    }

    static var totalCount: Int {
        tasks.count
    }
}
