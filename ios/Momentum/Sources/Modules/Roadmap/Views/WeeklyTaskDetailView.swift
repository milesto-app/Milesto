import SwiftUI

struct WeeklyTaskDetailView: View {
    let tasks: [WeeklyTaskDTO]
    let weekNumber: Int?
    let onToggle: ((WeeklyTaskDTO) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var orderedIds: [String]
    @State private var currentIndex: Int
    @State private var appeared = false

    init(
        tasks: [WeeklyTaskDTO],
        orderedIds: [String],
        startIndex: Int = 0,
        weekNumber: Int? = nil,
        onToggle: ((WeeklyTaskDTO) -> Void)? = nil
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
            if orderedIds.indices.contains(currentIndex),
               !liveIds.contains(orderedIds[currentIndex]) {
                dismiss()
            }
        }
    }
}

private struct WeeklyTaskDetailPage: View {
    let task: WeeklyTaskDTO
    let weekNumber: Int?
    let indexInWeek: Int
    let totalInWeek: Int
    let appeared: Bool
    let onToggle: ((WeeklyTaskDTO) -> Void)?

    private var accent: Color {
        switch task.difficultyRating {
        case .easy: return Color("TintPrimary")
        case .moderate: return Color("AccentAmber")
        case .hard: return Color("StatusError")
        case nil: return Color("TintPrimary")
        }
    }

    private var difficultyLabel: String {
        switch task.difficultyRating {
        case .easy: return String(localized: "home.tasks.difficulty.easy", table: "Home")
        case .moderate: return String(localized: "home.tasks.difficulty.moderate", table: "Home")
        case .hard: return String(localized: "home.tasks.difficulty.hard", table: "Home")
        case nil: return ""
        }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 32) {
                heroCard
                    .padding(.horizontal, 20)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 12)

                descriptionCard
                    .padding(.horizontal, 24)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 12)

                if onToggle != nil {
                    toggleButton
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 12)
                }
            }
            .padding(.bottom, 40)
        }
        .contentMargins(.top, 96)
    }

    private var heroCard: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [accent.opacity(0.32), accent.opacity(0.06)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(accent.opacity(0.35), lineWidth: 1)

            GeometryReader { geo in
                ZStack {
                    Circle()
                        .stroke(accent.opacity(0.22), lineWidth: 1)
                        .frame(width: 260, height: 260)
                        .position(x: geo.size.width - 40, y: 0)
                    Circle()
                        .stroke(accent.opacity(0.14), lineWidth: 1)
                        .frame(width: 420, height: 420)
                        .position(x: geo.size.width - 40, y: 0)
                    Circle()
                        .stroke(accent.opacity(0.08), lineWidth: 1)
                        .frame(width: 600, height: 600)
                        .position(x: geo.size.width - 40, y: 0)

                    Text(verbatim: String(format: "%02d", indexInWeek + 1))
                        .font(.custom("Geist-Bold", size: 108))
                        .tracking(-4)
                        .foregroundStyle(accent.opacity(0.18))
                        .position(x: geo.size.width - 64, y: 68)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))

            VStack(alignment: .leading, spacing: 24) {
                eyebrowRow

                AppText(verbatim: task.title, style: .largeTitle)
                    .weight(.semibold)
                    .color(Color("TextPrimary"))
                    .containerRelativeFrame(.horizontal, alignment: .leading) { width, _ in
                        width * 0.7
                    }

                HStack(alignment: .center, spacing: 12) {
                    if totalInWeek > 1 {
                        HStack(spacing: 6) {
                            ForEach(0 ..< totalInWeek, id: \.self) { i in
                                Capsule()
                                    .fill(i == indexInWeek ? accent : accent.opacity(0.22))
                                    .frame(
                                        width: i == indexInWeek ? 20 : 6,
                                        height: 4
                                    )
                            }
                        }
                    }

                    Spacer(minLength: 0)

                    if task.difficultyRating != nil {
                        difficultyBadge
                    }
                }
            }
            .padding(24)
        }
    }

    private var difficultyBadge: some View {
        AppText(verbatim: difficultyLabel, style: .caption)
            .weight(.medium)
            .color(accent)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(
                Capsule()
                    .fill(accent.opacity(0.15))
            )
            .overlay(
                Capsule()
                    .stroke(accent.opacity(0.3), lineWidth: 1)
            )
    }

    private var eyebrowRow: some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Rectangle()
                    .fill(accent)
                    .frame(width: 18, height: 1)
                AppText("roadmap.task.eyebrow", table: "Roadmap", style: .caption)
                    .weight(.semibold)
                    .color(accent)
            }

            if let weekNumber {
                AppText(
                    verbatim: "·",
                    style: .caption
                )
                .color(Color("TextSecondary").opacity(0.6))

                AppText(
                    verbatim: String(
                        format: String(localized: "roadmap.task.weekShort", table: "Roadmap"),
                        weekNumber
                    ),
                    style: .caption
                )
                .weight(.semibold)
                .color(Color("TextSecondary"))
            }

            Spacer()
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("roadmap.task.description", table: "Roadmap", style: .headline)

            AppText(verbatim: task.description, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var toggleButton: some View {
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                performToggle()
            }
        } label: {
            HStack(spacing: 10) {
                TablerIcons(
                    task.isCompleted ? .arrowBackUp : .check,
                    size: 20,
                    color: Color("TextOnAccent")
                )

                AppText(
                    task.isCompleted ? "roadmap.task.markIncomplete" : "roadmap.task.markComplete",
                    table: "Roadmap",
                    style: .body
                )
                .weight(.semibold)
                .color(Color("TextOnAccent"))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .padding(.horizontal, 24)
        }
        .glassEffect(
            .regular.interactive().tint(accent),
            in: RoundedRectangle(cornerRadius: 16)
        )
    }

    private func performToggle() {
        let newCompleted = !task.isCompleted
        let updated = WeeklyTaskDTO(
            id: task.id,
            weeklyPlanId: task.weeklyPlanId,
            goalId: task.goalId,
            userId: task.userId,
            title: task.title,
            description: task.description,
            difficultyRating: task.difficultyRating,
            orderIndex: task.orderIndex,
            isCompleted: newCompleted,
            isFallback: task.isFallback,
            createdAt: task.createdAt
        )
        onToggle?(updated)
    }
}

#Preview("Hard task") {
    let tasks: [WeeklyTaskDTO] = [
        WeeklyTaskDTO(
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
        WeeklyTaskDTO(
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
        WeeklyTaskDTO(
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
        )
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
    let task = WeeklyTaskDTO(
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
