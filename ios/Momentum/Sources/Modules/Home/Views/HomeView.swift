import SwiftData
import SwiftUI

struct HomeView: View {
    let goalId: String
    let firstName: String

    @Environment(\.modelContext) var modelContext
    @Query var localGoals: [LocalGoal]
    @State var weeklyPlan: WeeklyPlanDTO?
    @State var tasks: [WeeklyTaskDTO] = []
    @State var todayDebrief: DebriefDTO?
    @State var isLoading = true
    @State var hasSyncError = false
    @State private var showDebriefSheet = false
    @State private var showWeeklyPlanDetail = false
    @State private var showWeeklyPlanGeneration = false
    @State private var selectedTaskId: String?

    private var currentGoal: LocalGoal? {
        localGoals.first { $0.id == goalId }
    }

    private var currentMilestoneTitle: String? {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let roadmap = try? modelContext.fetch(descriptor).first,
              let currentId = roadmap.currentMilestoneId,
              let milestone = roadmap.milestones.first(where: { $0.id == currentId })
        else { return nil }
        return milestone.title
    }

    var completedCount: Int {
        tasks.filter(\.isCompleted).count
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: Date()).capitalized
    }

    var goalProgress: Double {
        guard !tasks.isEmpty else { return 0 }
        let total = tasks.count
        let completed = tasks.filter(\.isCompleted).count
        return total > 0 ? Double(completed) / Double(total) : 0
    }

    var sortedTasks: [WeeklyTaskDTO] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            let p0 = $0.difficultyRating.priority
            let p1 = $1.difficultyRating.priority
            if p0 != p1 { return p0 < p1 }
            return $0.orderIndex < $1.orderIndex
        }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        HomeHeroSection(
                            formattedDate: formattedDate,
                            title: currentMilestoneTitle ?? currentGoal?.title ?? "",
                            progress: goalProgress
                        )

                        if isLoading && tasks.isEmpty && weeklyPlan == nil {
                            ProgressView()
                                .padding(.top, 40)
                        } else if hasSyncError && tasks.isEmpty && weeklyPlan == nil {
                            HomeSyncErrorSection {
                                isLoading = true
                                Task { await loadAllData() }
                            }
                        } else {
                            contentSection
                        }
                    }
                }
                .hapticRefreshable {
                    await loadAllData()
                }
            }
        }
        .task {
            await loadAllData()
        }
        .onChange(of: goalId) {
            tasks = []
            weeklyPlan = nil
            todayDebrief = nil
            isLoading = true
            Task {
                await loadAllData()
            }
        }
        .sheet(isPresented: $showDebriefSheet) {
            if let weeklyPlan {
                DebriefSheetView(
                    goalId: goalId,
                    weeklyPlanId: weeklyPlan.id,
                    completedTasks: tasks.filter(\.isCompleted),
                    onDebriefComplete: {
                        showWeeklyPlanGeneration = true
                    }
                )
            }
        }
        .fullScreenCover(isPresented: $showWeeklyPlanGeneration, onDismiss: {
            weeklyPlan = nil
            tasks = []
            todayDebrief = nil
            isLoading = true
            Task {
                await loadAllData()
            }
        }) {
            WeeklyPlanGenerationView(goalId: goalId) {
                showWeeklyPlanGeneration = false
            }
        }
    }

    private var contentSection: some View {
        VStack(spacing: 16) {
            if !tasks.isEmpty && tasks.allSatisfy(\.isCompleted) && todayDebrief?.weeklyPlanId != weeklyPlan?.id {
                DebriefPromptCard {
                    showDebriefSheet = true
                }
                .padding(.horizontal, 16)
            }

            HomeTasksListSection(
                tasks: tasks,
                sortedTasks: sortedTasks,
                completedCount: completedCount,
                onToggle: { task in
                    toggleTask(task)
                },
                onOpen: { taskId in
                    selectedTaskId = taskId
                }
            )
        }
        .padding(.bottom, 40)
        .navigationDestination(isPresented: $showWeeklyPlanDetail) {
            if let weeklyPlan {
                WeeklyPlanDetailView(
                    weekNumber: weeklyPlan.weekNumber,
                    weekStartDate: weeklyPlan.weekStartDate,
                    objectives: weeklyPlan.objectives,
                    summary: weeklyPlan.summary,
                    status: weeklyPlan.status
                )
            }
        }
        .navigationDestination(item: $selectedTaskId) { taskId in
            let ordered = sortedTasks.map(\.id)
            if let start = ordered.firstIndex(of: taskId) {
                WeeklyTaskDetailView(
                    tasks: tasks,
                    orderedIds: ordered,
                    startIndex: start,
                    weekNumber: weeklyPlan?.weekNumber,
                    onToggle: { updated in
                        applyRemoteToggle(updated)
                    }
                )
            }
        }
    }
}

#Preview {
    HomeView(goalId: "preview-goal", firstName: "Maty")
        .modelContainer(for: [LocalGoal.self, LocalWeeklyTask.self, LocalWeeklyPlan.self, LocalDebrief.self], inMemory: true)
}
