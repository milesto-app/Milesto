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
