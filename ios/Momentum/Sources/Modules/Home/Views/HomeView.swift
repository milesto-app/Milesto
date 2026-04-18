import SwiftData
import SwiftUI

struct HomeView: View {
    let goalId: String
    let firstName: String

    @Environment(\.modelContext) private var modelContext
    @Query private var localGoals: [LocalGoal]
    @State private var weeklyPlan: WeeklyPlanDTO?
    @State private var tasks: [WeeklyTaskDTO] = []
    @State private var todayDebrief: DebriefDTO?
    @State private var isLoading = true
    @State private var hasSyncError = false
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

    private var completedCount: Int {
        tasks.filter(\.isCompleted).count
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
                        heroSection

                        if isLoading && tasks.isEmpty && weeklyPlan == nil {
                            ProgressView()
                                .padding(.top, 40)
                        } else if hasSyncError && tasks.isEmpty && weeklyPlan == nil {
                            syncErrorSection
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

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                AppText(verbatim: formattedDate, style: .caption)
                    .color(Color("TextSecondary"))

                AppText(verbatim: currentMilestoneTitle ?? currentGoal?.title ?? "", style: .title)
            }

            VStack(alignment: .leading, spacing: 8) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color("TextSecondary").opacity(0.3))
                            .frame(height: 10)
                        Capsule()
                            .fill(Color("TintPrimary"))
                            .frame(
                                width: max(geometry.size.width * goalProgress, goalProgress > 0 ? 10 : 0),
                                height: 10
                            )
                            .animation(.easeInOut(duration: 0.3), value: goalProgress)
                    }
                }
                .frame(height: 10)

                HStack {
                    AppText(
                        verbatim: "\(Int(goalProgress * 100))%",
                        style: .subheadline
                    )
                    .weight(.semibold)
                    .color(Color("TintPrimary"))
                    .contentTransition(.numericText())
                    .animation(.easeInOut(duration: 0.3), value: goalProgress)
                    Spacer()
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 32)
    }

    private var goalProgress: Double {
        guard !tasks.isEmpty else { return 0 }
        let total = tasks.count
        let completed = tasks.filter(\.isCompleted).count
        return total > 0 ? Double(completed) / Double(total) : 0
    }

    private var contentSection: some View {
        VStack(spacing: 16) {
            if !tasks.isEmpty && tasks.allSatisfy(\.isCompleted) && todayDebrief?.weeklyPlanId != weeklyPlan?.id {
                DebriefPromptCard {
                    showDebriefSheet = true
                }
                .padding(.horizontal, 16)
            }

            HStack {
                AppText("home.tasks", table: "Home", style: .headline)
                Spacer()
                AppText(
                    verbatim: "\(completedCount)/\(tasks.count)",
                    style: .subheadline
                )
                .color(Color("TintPrimary"))
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)

            tasksSection
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
            if let task = tasks.first(where: { $0.id == taskId }) {
                WeeklyTaskDetailView(
                    task: task,
                    weekNumber: weeklyPlan?.weekNumber,
                    indexInWeek: sortedTasks.firstIndex(where: { $0.id == taskId }) ?? 0,
                    totalInWeek: tasks.count,
                    onToggle: { updated in
                        applyRemoteToggle(updated)
                    }
                )
            }
        }
    }

    private var sortedTasks: [WeeklyTaskDTO] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            let p0 = $0.difficultyRating.priority
            let p1 = $1.difficultyRating.priority
            if p0 != p1 { return p0 < p1 }
            return $0.orderIndex < $1.orderIndex
        }
    }

    private func applyRemoteToggle(_ updated: WeeklyTaskDTO) {
        if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
            tasks[idx] = updated
        }
        updateCachedTask(id: updated.id, isCompleted: updated.isCompleted)

        Task {
            do {
                let remote = try await RoadmapAPIService.shared.toggleTask(
                    taskId: updated.id,
                    isCompleted: updated.isCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == remote.id }) {
                    tasks[idx] = remote
                }
                updateCachedTask(id: remote.id, isCompleted: remote.isCompleted)
            } catch {
                let reverted = !updated.isCompleted
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    let original = tasks[idx]
                    tasks[idx] = WeeklyTaskDTO(
                        id: original.id,
                        weeklyPlanId: original.weeklyPlanId,
                        goalId: original.goalId,
                        userId: original.userId,
                        title: original.title,
                        description: original.description,
                        difficultyRating: original.difficultyRating,
                        orderIndex: original.orderIndex,
                        isCompleted: reverted,
                        isFallback: original.isFallback,
                        createdAt: original.createdAt
                    )
                }
                updateCachedTask(id: updated.id, isCompleted: reverted)
            }
        }
    }

    private var syncErrorSection: some View {
        VStack(spacing: 16) {
            TablerIcons(.cloudOff, size: 40, color: Color("TextSecondary"))
            AppText("home.sync.error", table: "Home", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)
            AppButton("home.sync.retry", table: "Home", style: .secondary) {
                isLoading = true
                Task { await loadAllData() }
            }
            .icon(.refresh)
        }
        .padding(.top, 40)
        .padding(.horizontal, 32)
    }

    @ViewBuilder
    private var tasksSection: some View {
        if tasks.isEmpty {
            AppText("home.tasks.empty", table: "Home", style: .subheadline)
                .color(Color("TextSecondary"))
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
        } else {
            VStack(spacing: 4) {
                ForEach(sortedTasks) { task in
                    ObjectiveRowView(
                        task: task,
                        onToggle: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                toggleTask(task)
                            }
                        },
                        onOpen: {
                            selectedTaskId = task.id
                        }
                    )
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut(duration: 0.3), value: tasks.map(\.isCompleted))
        }
    }

    private func toggleTask(_ task: WeeklyTaskDTO) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let newCompleted = !task.isCompleted
        let original = tasks[index]

        tasks[index] = WeeklyTaskDTO(
            id: original.id,
            weeklyPlanId: original.weeklyPlanId,
            goalId: original.goalId,
            userId: original.userId,
            title: original.title,
            description: original.description,
            difficultyRating: original.difficultyRating,
            orderIndex: original.orderIndex,
            isCompleted: newCompleted,
            isFallback: original.isFallback,
            createdAt: original.createdAt
        )

        updateCachedTask(id: task.id, isCompleted: newCompleted)

        Task {
            do {
                let updated = try await RoadmapAPIService.shared.toggleTask(
                    taskId: task.id,
                    isCompleted: newCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    tasks[idx] = updated
                }
                updateCachedTask(id: updated.id, isCompleted: updated.isCompleted)
            } catch {
                if let idx = tasks.firstIndex(where: { $0.id == original.id }) {
                    tasks[idx] = original
                }
                updateCachedTask(id: original.id, isCompleted: original.isCompleted)
            }
        }
    }

    private func updateCachedTask(id: String, isCompleted: Bool) {
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.id == id }
        )
        if let local = try? modelContext.fetch(descriptor).first {
            local.isCompleted = isCompleted
        }
    }

    private func loadAllData() async {
        hasSyncError = false

        let cachedTasks = fetchCachedTasks()
        if !cachedTasks.isEmpty {
            tasks = cachedTasks
            isLoading = false
        }

        if weeklyPlan == nil {
            weeklyPlan = fetchCachedWeeklyPlan()
        }

        if let cached = fetchCachedDebrief() {
            todayDebrief = cached
        }

        var didSync = false

        async let fetchPlan: () = loadWeeklyPlan()
        async let fetchTasks: () = loadTasks()
        _ = await(fetchPlan, fetchTasks)
        didSync = !tasks.isEmpty || weeklyPlan != nil

        if let debriefs = try? await RoadmapAPIService.shared.getDebriefHistory(goalId: goalId) {
            let latestDebrief = debriefs.first
            todayDebrief = latestDebrief
            syncDebriefToCache(latestDebrief)
        }

        if !didSync, tasks.isEmpty, weeklyPlan == nil {
            hasSyncError = true
        }

        isLoading = false
    }

    private func loadWeeklyPlan() async {
        if weeklyPlan == nil {
            weeklyPlan = fetchCachedWeeklyPlan()
        }

        if let existing = try? await RoadmapAPIService.shared.getWeeklyPlan(goalId: goalId) {
            weeklyPlan = existing
            upsertWeeklyPlanToCache(existing)
            return
        }
        if let generated = try? await RoadmapAPIService.shared.generateWeeklyPlan(goalId: goalId) {
            weeklyPlan = generated
            upsertWeeklyPlanToCache(generated)
        }
    }

    private func fetchCachedWeeklyPlan() -> WeeklyPlanDTO? {
        let goalId = goalId
        let activeStatus = WeeklyPlanStatus.active.rawValue
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.goalId == goalId && $0.status == activeStatus }
        )
        guard let local = try? modelContext.fetch(descriptor).first else { return nil }
        return WeeklyPlanDTO(
            id: local.id,
            milestoneId: local.milestoneId,
            goalId: local.goalId,
            userId: local.userId,
            weekNumber: local.weekNumber,
            weekStartDate: local.weekStartDate,
            objectives: local.objectives,
            summary: local.summary,
            status: local.weeklyPlanStatus,
            isFallback: local.isFallback,
            createdAt: local.createdAt
        )
    }

    private func upsertWeeklyPlanToCache(_ dto: WeeklyPlanDTO) {
        let planId = dto.id
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.id == planId }
        )

        if let existing = try? modelContext.fetch(descriptor).first {
            existing.milestoneId = dto.milestoneId
            existing.weekNumber = dto.weekNumber
            existing.weekStartDate = dto.weekStartDate
            existing.objectives = dto.objectives
            existing.status = dto.status.rawValue
            existing.isFallback = dto.isFallback
            existing.summaryCompletionRate = dto.summary?.completionRate
            existing.summaryTasksCompleted = dto.summary?.tasksCompleted
            existing.summaryTasksTotal = dto.summary?.tasksTotal
            existing.summaryDebriefCount = dto.summary?.debriefCount
            existing.summaryNarrative = dto.summary?.narrative
        } else {
            let local = LocalWeeklyPlan(
                id: dto.id,
                milestoneId: dto.milestoneId,
                goalId: dto.goalId,
                userId: dto.userId,
                weekNumber: dto.weekNumber,
                weekStartDate: dto.weekStartDate,
                objectives: dto.objectives,
                status: dto.status.rawValue,
                isFallback: dto.isFallback,
                createdAt: dto.createdAt,
                summary: dto.summary
            )
            modelContext.insert(local)
        }
    }

    private func loadTasks() async {
        let cachedTasks = fetchCachedTasks()
        if !cachedTasks.isEmpty {
            tasks = cachedTasks
        }

        if let fetched = try? await RoadmapAPIService.shared.getWeeklyTasks(goalId: goalId) {
            tasks = fetched
            syncTasksToCache(fetched)
        }
    }

    private func fetchCachedTasks() -> [WeeklyTaskDTO] {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.orderIndex)]
        )
        guard let cached = try? modelContext.fetch(descriptor), !cached.isEmpty else { return [] }
        return cached.map { local in
            WeeklyTaskDTO(
                id: local.id,
                weeklyPlanId: local.weeklyPlanId,
                goalId: local.goalId,
                userId: local.userId,
                title: local.title,
                description: local.taskDescription,
                difficultyRating: local.difficultyRating.flatMap { DifficultyRating(rawValue: $0) },
                orderIndex: local.orderIndex,
                isCompleted: local.isCompleted,
                isFallback: local.isFallback,
                createdAt: local.createdAt
            )
        }
    }

    private func fetchCachedDebrief() -> DebriefDTO? {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        guard let local = try? modelContext.fetch(descriptor).first else { return nil }
        let taskRatings: [TaskRatingDTO] = local.taskRatingsJSON
            .flatMap { try? JSONDecoder().decode([TaskRatingDTO].self, from: $0) } ?? []
        return DebriefDTO(
            id: local.id,
            goalId: local.goalId,
            userId: local.userId,
            weeklyPlanId: local.weeklyPlanId,
            date: local.date,
            note: local.note,
            taskRatings: taskRatings,
            createdAt: local.createdAt
        )
    }

    private func syncDebriefToCache(_ dto: DebriefDTO?) {
        guard let dto else { return }

        let debriefId = dto.id
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.id == debriefId }
        )
        let existing = try? modelContext.fetch(descriptor).first

        let ratingsData = try? JSONEncoder().encode(dto.taskRatings)

        if let existing {
            existing.note = dto.note
            existing.weeklyPlanId = dto.weeklyPlanId
            existing.taskRatingsJSON = ratingsData
        } else {
            let local = LocalDebrief(
                id: dto.id,
                goalId: dto.goalId,
                userId: dto.userId,
                weeklyPlanId: dto.weeklyPlanId,
                date: dto.date,
                note: dto.note,
                taskRatingsJSON: ratingsData,
                createdAt: dto.createdAt
            )
            modelContext.insert(local)
        }
    }

    private func syncTasksToCache(_ dtos: [WeeklyTaskDTO]) {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? modelContext.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })
        let remoteIds = Set(dtos.map(\.id))

        for dto in dtos {
            if let local = existingById[dto.id] {
                local.weeklyPlanId = dto.weeklyPlanId
                local.title = dto.title
                local.taskDescription = dto.description
                local.difficultyRating = dto.difficultyRating?.rawValue
                local.orderIndex = dto.orderIndex
                local.isCompleted = dto.isCompleted
                local.isFallback = dto.isFallback
            } else {
                let local = LocalWeeklyTask(
                    id: dto.id,
                    weeklyPlanId: dto.weeklyPlanId,
                    goalId: dto.goalId,
                    userId: dto.userId,
                    title: dto.title,
                    taskDescription: dto.description,
                    difficultyRating: dto.difficultyRating?.rawValue,
                    orderIndex: dto.orderIndex,
                    isCompleted: dto.isCompleted,
                    isFallback: dto.isFallback,
                    createdAt: dto.createdAt
                )
                modelContext.insert(local)
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            modelContext.delete(local)
        }
    }
}

#Preview {
    HomeView(goalId: "preview-goal", firstName: "Maty")
        .modelContainer(for: [LocalGoal.self, LocalWeeklyTask.self, LocalWeeklyPlan.self, LocalDebrief.self], inMemory: true)
}
