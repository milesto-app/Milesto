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
    var isKeyMilestone: Bool
}

struct RoadmapView: View {
    let goalId: String
    var onGoalChanged: ((String) -> Void)?

    @Environment(\.modelContext) var modelContext
    @EnvironmentObject private var permissionCoordinator: PermissionPromptCoordinator
    @Query var localGoals: [LocalGoal]
    @State var milestones: [DisplayMilestone] = []
    @State var isLoading = true
    @State var appeared = false
    @State private var selectedMilestone: DisplayMilestone?

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

                            RoadmapStreakCard(goalId: goalId)

                            VStack(spacing: 0) {
                                ForEach(Array(milestones.enumerated()), id: \.element.id) { index, milestone in
                                    Button {
                                        selectedMilestone = milestone
                                    } label: {
                                        RoadmapMilestoneRow(
                                            milestone: milestone,
                                            index: index,
                                            total: milestones.count,
                                            previousStatus: index > 0 ? milestones[index - 1].status : nil,
                                            nextStatus: index < milestones.count - 1 ? milestones[index + 1].status : nil
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    .opacity(appeared ? 1 : 0)
                                    .animation(
                                        .easeOut(duration: 0.35).delay(Double(index) * 0.06 + 0.1),
                                        value: appeared
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
                    isMonthlyCheckpoint: milestone.isMonthlyCheckpoint,
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
                permissionCoordinator.tryTriggerOnFirstRoadmapDisplay()
            }
        }
        .onChange(of: milestones.isEmpty) { _, isEmpty in
            if !isEmpty {
                permissionCoordinator.tryTriggerOnFirstRoadmapDisplay()
            }
        }
        .onChange(of: goalId) {
            milestones = []
            isLoading = true
            appeared = false
            Task {
                await loadMilestones()
                if !appeared {
                    appeared = true
                }
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

#Preview {
    RoadmapView(goalId: "preview-goal")
        .modelContainer(for: [LocalGoal.self], inMemory: true)
}
