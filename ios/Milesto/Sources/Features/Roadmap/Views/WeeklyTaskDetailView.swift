import SwiftUI

struct WeeklyTaskDetailView: View {
    let tasks: [WeeklyTask]
    let weekNumber: Int?
    let onToggle: ((WeeklyTask) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var orderedIds: [String]
    @State private var currentIndex: Int
    @State private var appeared = false

    init(
        tasks: [WeeklyTask],
        orderedIds: [String],
        startIndex: Int = 0,
        weekNumber: Int? = nil,
        onToggle: ((WeeklyTask) -> Void)? = nil
    ) {
        self.tasks = tasks
        self.weekNumber = weekNumber
        self.onToggle = onToggle
        _orderedIds = State(initialValue: orderedIds)
        let count = orderedIds.count
        _currentIndex = State(initialValue: count == 0 ? 0 : min(max(startIndex, 0), count - 1))
    }

    var body: some View {
        Group {
            if orderedIds.isEmpty {
                Color.clear
            } else {
                TabView(selection: $currentIndex) {
                    ForEach(Array(orderedIds.enumerated()), id: \.element) { index, id in
                        Group {
                            if let task = tasks.first(where: { $0.id == id }) {
                                WeeklyTaskDetailPage(
                                    task: task,
                                    weekNumber: weekNumber,
                                    indexInWeek: index,
                                    totalInWeek: orderedIds.count,
                                    appeared: appeared,
                                    onToggle: onToggle
                                )
                            } else {
                                Color.clear
                            }
                        }
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
        .overlay(alignment: .top) {
            ProgressiveBlur()
                .allowsHitTesting(false)
        }
        .overlay(alignment: .topLeading) {
            Button {
                dismiss()
            } label: {
                TablerIcons(.chevronLeft, size: 24, color: Color("TextPrimary"))
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .animation(.easeOut(duration: 0.45), value: appeared)
        .onAppear { appeared = true }
        .onChange(of: tasks.map(\.id)) { _, liveIds in
            let liveSet = Set(liveIds)
            let visibleId = orderedIds.indices.contains(currentIndex) ? orderedIds[currentIndex] : nil

            guard let visibleId else {
                dismiss()
                return
            }
            guard liveSet.contains(visibleId) else {
                dismiss()
                return
            }

            let reconciled = orderedIds.filter { liveSet.contains($0) }
            if reconciled != orderedIds {
                orderedIds = reconciled
                currentIndex = reconciled.firstIndex(of: visibleId) ?? 0
            }
        }
    }
}

#Preview("Hard task") {
    let tasks: [WeeklyTask] = [
        WeeklyTask(
            id: "1",
            weeklyPlanId: "wp1",
            goalId: "g1",
            userId: "u1",
            title: "Run 8 km without stopping",
            description: "Keep a steady pace around 6:30/km. Finish the block on a tree-lined route so the last kilometre feels like a reward instead of a grind.",
            difficultyRating: .hard,
            orderIndex: 1,
            isCompleted: false,
            isFallback: false,
            createdAt: ""
        ),
        WeeklyTask(
            id: "2",
            weeklyPlanId: "wp1",
            goalId: "g1",
            userId: "u1",
            title: "Stretch for 10 minutes",
            description: "Focus on hamstrings and calves right after breakfast.",
            difficultyRating: .easy,
            orderIndex: 0,
            isCompleted: true,
            isFallback: false,
            createdAt: ""
        ),
        WeeklyTask(
            id: "3",
            weeklyPlanId: "wp1",
            goalId: "g1",
            userId: "u1",
            title: "Hydrate and recover",
            description: "Drink at least 2L of water today and foam-roll after your run.",
            difficultyRating: .moderate,
            orderIndex: 2,
            isCompleted: false,
            isFallback: false,
            createdAt: ""
        ),
    ]
    return NavigationStack {
        WeeklyTaskDetailView(
            tasks: tasks,
            orderedIds: tasks.map(\.id),
            startIndex: 0,
            weekNumber: 3,
            onToggle: { _ in }
        )
    }
}

#Preview("Single task") {
    let task = WeeklyTask(
        id: "2",
        weeklyPlanId: "wp1",
        goalId: "g1",
        userId: "u1",
        title: "Stretch for 10 minutes",
        description: "Focus on hamstrings and calves right after breakfast.",
        difficultyRating: .easy,
        orderIndex: 0,
        isCompleted: true,
        isFallback: false,
        createdAt: ""
    )
    return NavigationStack {
        WeeklyTaskDetailView(
            tasks: [task],
            orderedIds: [task.id],
            startIndex: 0,
            weekNumber: 3,
            onToggle: { _ in }
        )
    }
}
