import SwiftData
import SwiftUI

struct DisplayMilestone: Identifiable {
    let id: String
    let title: String
    let description: String
    let targetMonth: Int
    let targetWeek: Int
    let isMonthlyCheckpoint: Bool
    let orderIndex: Int
    let expectedOutcome: String
    let status: MilestoneStatus
    let progress: Double
}

struct RoadmapMonthSection: Identifiable {
    let targetMonth: Int
    let milestones: [DisplayMilestone]

    var id: Int {
        targetMonth
    }

    var title: String {
        String(format: String(localized: "roadmap.phase.month", table: "Roadmap"), targetMonth)
    }

    var subtitle: String {
        let weekRange = milestones.map(\.targetWeek).filter { $0 > 0 }.minAndMax()
        guard let firstWeek = weekRange.min, let lastWeek = weekRange.max else {
            return String(localized: "roadmap.phase.milestones", table: "Roadmap")
        }

        if firstWeek == lastWeek {
            return String(format: String(localized: "roadmap.phase.week", table: "Roadmap"), firstWeek)
        }

        return String(format: String(localized: "roadmap.phase.weekRange", table: "Roadmap"), firstWeek, lastWeek)
    }

    var isCurrent: Bool {
        milestones.contains { $0.status == .current }
    }

    var isComplete: Bool {
        !milestones.isEmpty && milestones.allSatisfy { $0.status == .completed }
    }

    var completedCount: Int {
        milestones.filter { $0.status == .completed }.count
    }

    func visibleMilestones(isExpanded: Bool) -> [DisplayMilestone] {
        if isComplete, !isExpanded {
            return []
        }

        if isCurrent, !isExpanded {
            return milestones.filter { $0.status != .completed }
        }

        return milestones
    }
}

struct RoadmapView: View {
    let goalId: String
    var onGoalChanged: ((String) -> Void)?

    @Environment(\.modelContext) var modelContext
    @Query var localGoals: [LocalGoal]
    @Query var localWeeklyTasks: [LocalWeeklyTask]
    @State var milestones: [DisplayMilestone] = []
    @State var isLoading = true
    @State var appeared = false
    @State private var selectedMilestone: DisplayMilestone?
    @State private var expandedPastSections: Set<Int> = []

    private var currentGoal: LocalGoal? {
        localGoals.first { $0.id == goalId }
    }

    private var switchableGoals: [LocalGoal] {
        localGoals.filter { $0.status == "active" || $0.status == ProfileStatus.intakeCompleted.rawValue }
    }

    private var completionProgress: Double {
        guard !milestones.isEmpty else { return 0 }
        let completed = Double(milestones.filter { $0.status == .completed }.count)
        let currentProgress = milestones.contains(where: { $0.status == .current }) ? currentTaskProgress() : 0
        return (completed + currentProgress) / Double(milestones.count)
    }

    private var monthSections: [RoadmapMonthSection] {
        let grouped = Dictionary(grouping: milestones) { $0.targetMonth }
        return grouped.keys.sorted().map { month in
            RoadmapMonthSection(
                targetMonth: month,
                milestones: (grouped[month] ?? []).sorted {
                    if $0.targetWeek != $1.targetWeek { return $0.targetWeek < $1.targetWeek }
                    return $0.orderIndex < $1.orderIndex
                }
            )
        }
    }

    private var weeklyTaskProgressSignature: String {
        localWeeklyTasks
            .filter { $0.goalId == goalId }
            .sorted { $0.id < $1.id }
            .map { "\($0.id):\($0.isCompleted)" }
            .joined(separator: "|")
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                if isLoading && milestones.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 0) {
                            RoadmapHeaderSection(
                                goalTitle: currentGoal?.title ?? "",
                                goalId: goalId,
                                switchableGoals: switchableGoals,
                                completionProgress: completionProgress,
                                appeared: appeared,
                                onGoalChanged: onGoalChanged
                            )

                            LazyVStack(spacing: 22) {
                                ForEach(Array(monthSections.enumerated()), id: \.element.id) { sectionIndex, section in
                                    RoadmapPhaseSection(
                                        section: section,
                                        isExpanded: expandedPastSections.contains(section.id),
                                        appeared: appeared,
                                        animationDelay: Double(sectionIndex) * 0.08 + 0.12,
                                        onToggleExpanded: { togglePastSection(section.id) },
                                        onSelect: { selectedMilestone = $0 }
                                    )
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        .padding(.bottom, 80)
                    }
                    .hapticRefreshable {
                        await loadMilestones()
                    }
                }
            }
            .navigationDestination(item: $selectedMilestone) { milestone in
                MilestoneDetailView(
                    milestoneId: milestone.id,
                    title: milestone.title,
                    description: milestone.description,
                    expectedOutcome: milestone.expectedOutcome,
                    status: milestone.status
                )
            }
        }
        .task {
            await loadMilestones()
        }
        .onAppear {
            appeared = true
            if !milestones.isEmpty {
                Task {
                    await loadMilestones()
                }
            }
        }
        .onChange(of: goalId) {
            milestones = []
            expandedPastSections = []
            isLoading = true
            appeared = false
            Task {
                await loadMilestones()
                if !appeared {
                    appeared = true
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .weeklyTaskCompletionDidChange)) { notification in
            guard notification.userInfo?["goalId"] as? String == goalId else { return }
            refreshDisplayedProgress()
        }
        .onChange(of: weeklyTaskProgressSignature) {
            refreshDisplayedProgress()
        }
    }

    private func togglePastSection(_ sectionId: Int) {
        if expandedPastSections.contains(sectionId) {
            expandedPastSections.remove(sectionId)
        } else {
            expandedPastSections.insert(sectionId)
        }
    }
}

extension DisplayMilestone: Hashable {
    static func == (lhs: DisplayMilestone, rhs: DisplayMilestone) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

private extension Array where Element == Int {
    func minAndMax() -> (min: Int?, max: Int?) {
        guard let first else { return (nil, nil) }
        return reduce((min: first, max: first)) { result, value in
            (Swift.min(result.min, value), Swift.max(result.max, value))
        }
    }
}

#Preview {
    RoadmapView(goalId: "preview-goal")
        .modelContainer(for: [LocalGoal.self], inMemory: true)
}
