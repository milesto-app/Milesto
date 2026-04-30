import SwiftUI

struct HomeView: View {
    let goalId: String
    let firstName: String

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: HomeViewModel?
    @State private var showDebriefSheet = false
    @State private var showWeeklyPlanDetail = false
    @State private var showWeeklyPlanGeneration = false
    @State private var selectedTaskId: String?

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: Date()).capitalized
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
                let vm = HomeViewModel(repository: dependencies.home)
                vm.configure(goalId: goalId)
                model = vm
            }
            await model?.loadAllData()
        }
        .onChange(of: goalId) {
            model?.resetForGoalChange()
            model?.configure(goalId: goalId)
            Task { await model?.loadAllData() }
        }
    }

    private func content(model: HomeViewModel) -> some View {
        NavigationStack {
            ZStack(alignment: .top) {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        HomeHeroSection(
                            formattedDate: formattedDate,
                            title: model.heroTitle,
                            progress: model.goalProgress
                        )

                        if model.isLoading && model.tasks.isEmpty && model.weeklyPlan == nil {
                            ProgressView()
                                .padding(.top, 40)
                        } else if model.hasSyncError && model.tasks.isEmpty && model.weeklyPlan == nil {
                            HomeSyncErrorSection {
                                model.markRetryRequested()
                                Task { await model.loadAllData() }
                            }
                        } else {
                            contentSection(model: model)
                        }
                    }
                }
                .hapticRefreshable {
                    await model.loadAllData()
                }
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
            Task { await model.loadAllData() }
        }) {
            WeeklyPlanGenerationView(goalId: goalId) {
                showWeeklyPlanGeneration = false
            }
        }
    }

    private func contentSection(model: HomeViewModel) -> some View {
        VStack(spacing: 16) {
            if !model.tasks.isEmpty
                && model.tasks.allSatisfy(\.isCompleted)
                && model.todayDebrief?.weeklyPlanId != model.weeklyPlan?.id
            {
                DebriefPromptCard {
                    showDebriefSheet = true
                }
                .padding(.horizontal, 16)
            }

            HomeTasksListSection(
                tasks: model.tasks,
                sortedTasks: model.sortedTasks,
                completedCount: model.completedCount,
                onToggle: { task in model.toggleTask(task) },
                onOpen: { taskId in selectedTaskId = taskId }
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
