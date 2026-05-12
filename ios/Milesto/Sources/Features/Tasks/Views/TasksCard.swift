import SwiftUI

struct TasksCard: View {
    let title: LocalizedStringKey
    let titleTable: String?
    let icon: TablerIcon?
    let emptyText: LocalizedStringKey
    let emptyTextTable: String?
    let tasks: [TaskDTO]
    let isLoading: Bool
    let weekNumber: Int?
    let onToggle: ((TaskDTO) -> Void)?

    @State private var selectedTaskId: String?

    init(
        title: LocalizedStringKey,
        titleTable: String? = nil,
        icon: TablerIcon? = nil,
        emptyText: LocalizedStringKey,
        emptyTextTable: String? = nil,
        tasks: [TaskDTO],
        isLoading: Bool = false,
        weekNumber: Int? = nil,
        onToggle: ((TaskDTO) -> Void)? = nil
    ) {
        self.title = title
        self.titleTable = titleTable
        self.icon = icon
        self.emptyText = emptyText
        self.emptyTextTable = emptyTextTable
        self.tasks = tasks
        self.isLoading = isLoading
        self.weekNumber = weekNumber
        self.onToggle = onToggle
    }

    private var completedCount: Int {
        tasks.filter(\.isCompleted).count
    }

    var body: some View {
        VStack(spacing: 16) {
            header

            if isLoading && tasks.isEmpty {
                AppLoader()
                    .padding(.top, 24)
            } else if tasks.isEmpty {
                AppText(emptyText, table: emptyTextTable, style: .subheadline)
                    .color(Color("TextSecondary"))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 16)
            } else {
                taskList
            }
        }
        .popover(
            isPresented: Binding(
                get: { selectedTaskId != nil },
                set: { if !$0 { selectedTaskId = nil } }
            )
        ) {
            if let taskId = selectedTaskId,
               let task = tasks.first(where: { $0.id == taskId })
            {
                TaskDetailView(
                    task: task,
                    weekNumber: weekNumber,
                    onToggle: onToggle
                )
            }
        }
        .onChange(of: tasks.map(\.id)) { _, ids in
            if let id = selectedTaskId, !ids.contains(id) {
                selectedTaskId = nil
            }
        }
    }

    private var header: some View {
        HStack(spacing: 8) {
            if let icon {
                TablerIcons(icon, size: 20, color: Color("Brand"))
            }
            AppText(title, table: titleTable, style: .headline)
            Spacer()
            if !tasks.isEmpty {
                AppText(
                    verbatim: "\(completedCount)/\(tasks.count)",
                    style: .subheadline
                )
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
    }

    private var taskList: some View {
        VStack(spacing: 8) {
            ForEach(tasks) { task in
                taskSurface {
                    ObjectiveRowView(
                        task: task,
                        onToggle: {
                            guard let onToggle else { return }
                            withAnimation(.spring(response: 0.42, dampingFraction: 0.78, blendDuration: 0.08)) {
                                onToggle(task)
                            }
                        },
                        onOpen: {
                            selectedTaskId = task.id
                        }
                    )
                }
                .padding(.horizontal, 16)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.42, dampingFraction: 0.78, blendDuration: 0.08), value: tasks.map(\.isCompleted))
    }

    @ViewBuilder
    private func taskSurface<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        content()
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color("BackgroundSecondary"), in: shape)
            .contentShape(shape)
    }
}
