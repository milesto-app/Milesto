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
        if !isExpanded { return [] }
        return milestones
    }
}

struct RoadmapView: View {
    let goalId: String
    var onGoalChanged: ((String) -> Void)?

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: RoadmapViewModel?
    @State private var selectedMilestone: DisplayMilestone?
    @State private var expandedPastSections: Set<Int> = []
    @State private var collapsedSections: Set<Int> = []

    private var monthSections: [RoadmapMonthSection] {
        guard let model else { return [] }
        let grouped = Dictionary(grouping: model.milestones) { $0.targetMonth }
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

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                let vm = RoadmapViewModel(repository: dependencies.roadmap)
                vm.configure(goalId: goalId)
                model = vm
            }
            await model?.loadMilestones()
        }
        .onAppear {
            model?.appeared = true
            if let model, !model.milestones.isEmpty {
                Task { await model.loadMilestones() }
            }
        }
        .onChange(of: goalId) {
            guard let model else { return }
            model.resetForGoalChange()
            model.configure(goalId: goalId)
            expandedPastSections = []
            collapsedSections = []
            Task {
                await model.loadMilestones()
                if !model.appeared {
                    model.appeared = true
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .weeklyTaskCompletionDidChange)) { notification in
            guard notification.userInfo?["goalId"] as? String == goalId else { return }
            model?.refreshDisplayedProgress()
        }
    }

    private func content(model: RoadmapViewModel) -> some View {
        NavigationStack {
            ZStack(alignment: .top) {
                if model.isLoading && model.milestones.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 0) {
                            roadmapTitle

                            LazyVStack(spacing: 22) {
                                ForEach(Array(monthSections.enumerated()), id: \.element.id) { sectionIndex, section in
                                    RoadmapPhaseSection(
                                        section: section,
                                        isExpanded: isSectionExpanded(section),
                                        appeared: model.appeared,
                                        animationDelay: Double(sectionIndex) * 0.08 + 0.12,
                                        onToggleExpanded: { toggleSection(section) },
                                        onSelect: { selectedMilestone = $0 }
                                    )
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        .padding(.bottom, 80)
                    }
                    .hapticRefreshable {
                        await model.loadMilestones()
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
    }

    private var roadmapTitle: some View {
        AppText("roadmap.title", table: "Roadmap", style: .largeTitle)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 32)
            .padding(.bottom, 24)
    }

    private func isSectionExpanded(_ section: RoadmapMonthSection) -> Bool {
        if section.isComplete {
            return expandedPastSections.contains(section.id)
        }
        return !collapsedSections.contains(section.id)
    }

    private func toggleSection(_ section: RoadmapMonthSection) {
        if isSectionExpanded(section) {
            if section.isComplete {
                expandedPastSections.remove(section.id)
            } else {
                collapsedSections.insert(section.id)
            }
        } else {
            if section.isComplete {
                expandedPastSections.insert(section.id)
            } else {
                collapsedSections.remove(section.id)
            }
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
