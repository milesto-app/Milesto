import SwiftData
import SwiftUI

struct HomeView: View {
    let goalId: String
    let firstName: String

    @Environment(\.modelContext) private var modelContext
    @Query private var localGoals: [Goal]
    @State private var model = HomeViewModel()
    @State private var showDebriefSheet = false
    @State private var showWeeklyPlanDetail = false
    @State private var showWeeklyPlanGeneration = false
    @State private var selectedTaskId: String?

    private var currentGoal: Goal? {
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

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: Date()).capitalized
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        HomeHeroSection(
                            formattedDate: formattedDate,
                            title: currentMilestoneTitle ?? currentGoal?.title ?? "",
                            progress: model.goalProgress
                        )

                        if model.isLoading && model.tasks.isEmpty && model.weeklyPlan == nil {
                            ProgressView()
                                .padding(.top, 40)
                        } else if model.hasSyncError && model.tasks.isEmpty && model.weeklyPlan == nil {
                            HomeSyncErrorSection {
                                model.isLoading = true
                                Task { await model.loadAllData() }
                            }
                        } else {
                            contentSection
                        }
                    }
                }
                .hapticRefreshable {
                    await model.loadAllData()
                }
            }
        }
        .task {
            model.configure(goalId: goalId, modelContext: modelContext)
            await model.loadAllData()
        }
        .onChange(of: goalId) {
            model.configure(goalId: goalId, modelContext: modelContext)
            model.resetForGoalChange()
            Task {
                await model.loadAllData()
            }
        }
        .sheet(isPresented: $showDebriefSheet) {
            if let weeklyPlan = model.weeklyPlan {
                DebriefSheetView(
                    goalId: goalId,
                    weeklyPlanId: weeklyPlan.id,
                    completedTasks: model.tasks.filter(\.isCompleted),
                    onDebriefComplete: {
                        showWeeklyPlanGeneration = true
                    }
                )
            }
        }
        .fullScreenCover(isPresented: $showWeeklyPlanGeneration, onDismiss: {
            model.resetForGoalChange()
            Task {
                await model.loadAllData()
            }
        }) {
            WeeklyPlanGenerationView(goalId: goalId) {
                showWeeklyPlanGeneration = false
            }
        }
    }

    private var contentSection: some View {
        VStack(spacing: 16) {
            if !model.tasks.isEmpty && model.tasks.allSatisfy(\.isCompleted) && model.todayDebrief?.weeklyPlanId != model.weeklyPlan?.id {
                DebriefPromptCard {
                    showDebriefSheet = true
                }
                .padding(.horizontal, 16)
            }

            HomeTasksListSection(
                tasks: model.tasks,
                sortedTasks: model.sortedTasks,
                completedCount: model.completedCount,
                onToggle: { task in
                    model.toggleTask(task)
                },
                onOpen: { taskId in
                    selectedTaskId = taskId
                }
            )
        }
        .padding(.bottom, 40)
        .navigationDestination(isPresented: $showWeeklyPlanDetail) {
            if let weeklyPlan = model.weeklyPlan {
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
            let ordered = model.sortedTasks.map(\.id)
            if let start = ordered.firstIndex(of: taskId) {
                WeeklyTaskDetailView(
                    tasks: model.tasks,
                    orderedIds: ordered,
                    startIndex: start,
                    weekNumber: model.weeklyPlan?.weekNumber,
                    onToggle: { updated in
                        model.applyRemoteToggle(updated)
                    }
                )
            }
        }
    }
}

#Preview {
    HomeView(goalId: "preview-goal", firstName: "Maty")
        .modelContainer(for: [Goal.self, LocalWeeklyTask.self, LocalWeeklyPlan.self, LocalDebrief.self], inMemory: true)
}
