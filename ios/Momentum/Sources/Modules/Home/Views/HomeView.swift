import SwiftData
import SwiftUI

struct HomeView: View {
    let goalId: String
    let firstName: String

    @Environment(\.modelContext) private var modelContext
    @Query private var localGoals: [LocalGoal]
    @Query private var localCheckIns: [LocalCheckIn]
    @State private var weeklyPlan: WeeklyPlanDTO?
    @State private var objectives: [DailyObjectiveDTO] = []
    @State private var todayDebrief: DebriefDTO?
    @State private var isLoading = true
    @State private var showDebriefSheet = false
    @State private var showWeeklyPlanDetail = false

    private var currentGoal: LocalGoal? {
        localGoals.first { $0.id == goalId }
    }

    private var hasCheckedIn: Bool {
        localCheckIns.contains { $0.goalId == goalId && $0.date == todayDateString }
    }

    private var completedCount: Int {
        objectives.filter(\.isCompleted).count
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: Date()).capitalized
    }

    private var todayDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                AnimatedBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        heroSection

                        if isLoading {
                            ProgressView()
                                .padding(.top, 40)
                        } else {
                            contentSection
                        }
                    }
                }
                .refreshable {
                    let impact = UIImpactFeedbackGenerator(style: .medium)
                    impact.prepare()
                    impact.impactOccurred()

                    await loadAllData()

                    let notification = UINotificationFeedbackGenerator()
                    notification.notificationOccurred(.success)
                }
            }
        }
        .task {
            if hasCheckedIn {
                isLoading = false
            }
            await loadAllData()
        }
        .onChange(of: goalId) {
            objectives = []
            weeklyPlan = nil
            todayDebrief = nil
            isLoading = !hasCheckedIn
            Task {
                await loadAllData()
            }
        }
        .sheet(isPresented: $showDebriefSheet) {
            DebriefSheetView(
                goalId: goalId,
                completedObjectives: objectives.filter(\.isCompleted),
                onDebriefComplete: {
                    Task {
                        if let debriefs = try? await RoadmapAPIService.shared.getDebriefHistory(goalId: goalId) {
                            let dto = debriefs.first { $0.date == todayDateString }
                            todayDebrief = dto
                            syncDebriefToCache(dto)
                        }
                    }
                }
            )
        }
    }

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                AppText(
                    verbatim: String(
                        format: String(localized: "home.greeting", table: "Home"),
                        firstName
                    ),
                    style: .subheadline
                )
                .color(Colors.textSecondary)
                Spacer()
                AppText(verbatim: formattedDate, style: .caption)
                    .color(Colors.textSecondary)
            }

            AppText(verbatim: currentGoal?.title ?? "", style: .title)

            VStack(alignment: .leading, spacing: 8) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Colors.textSecondary.opacity(0.1))
                            .frame(height: 8)
                        Capsule()
                            .fill(Colors.accent)
                            .frame(
                                width: geometry.size.width * goalProgress,
                                height: 8
                            )
                    }
                }
                .frame(height: 8)

                HStack {
                    AppText(
                        verbatim: "\(Int(goalProgress * 100))%",
                        style: .subheadline
                    )
                    .weight(.semibold)
                    .color(Colors.accent)
                    Spacer()
                }
            }
        }
        .padding(24)
        .glassEffect(.clear.interactive(), in: RoundedRectangle(cornerRadius: 24))
        .padding(.horizontal, 16)
        .padding(.top, 32)
        .padding(.bottom, 16)
    }

    private var goalProgress: Double {
        guard hasCheckedIn, !objectives.isEmpty else { return 0 }
        let total = objectives.count
        let completed = objectives.filter(\.isCompleted).count
        return total > 0 ? Double(completed) / Double(total) : 0
    }

    private var contentSection: some View {
        VStack(spacing: 16) {
            if !hasCheckedIn {
                CheckInPromptCard(
                    firstName: firstName,
                    goalId: goalId,
                    onCheckInComplete: {
                        Task {
                            await syncCheckInsFromAPI()
                            await loadPostCheckInData()
                        }
                    }
                )
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }

            if let weeklyPlan {
                let focusData = WeeklyFocusData(
                    focus: weeklyPlan.focus,
                    weekNumber: weeklyPlan.weekNumber,
                    objectivesCount: weeklyPlan.objectives.count,
                    completedCount: weeklyPlan.summary?.objectivesCompleted ?? completedCount
                )
                WeeklyFocusCard(weeklyPlan: focusData) {
                    showWeeklyPlanDetail = true
                }
                .padding(.horizontal, 16)
            }

            if hasCheckedIn {
                HStack {
                    AppText("home.today", table: "Home", style: .headline)
                    Spacer()
                    AppText(
                        verbatim: "\(completedCount)/\(objectives.count)",
                        style: .subheadline
                    )
                    .color(Colors.accent)
                }
                .padding(.horizontal, 24)
                .padding(.top, 12)

                objectivesSection
            }

            if hasCheckedIn && objectives.contains(where: \.isCompleted) && todayDebrief == nil {
                DebriefPromptCard {
                    showDebriefSheet = true
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.bottom, 40)
        .navigationDestination(isPresented: $showWeeklyPlanDetail) {
            if let weeklyPlan {
                WeeklyPlanDetailView(
                    weekNumber: weeklyPlan.weekNumber,
                    weekStartDate: weeklyPlan.weekStartDate,
                    focus: weeklyPlan.focus,
                    objectives: weeklyPlan.objectives,
                    summary: weeklyPlan.summary,
                    status: weeklyPlan.status
                )
            }
        }
    }

    @ViewBuilder
    private var objectivesSection: some View {
        if objectives.isEmpty {
            AppText("home.objectives.locked", table: "Home", style: .subheadline)
                .color(Colors.textSecondary)
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
        } else {
            VStack(spacing: 4) {
                ForEach(objectives.sorted(by: { $0.orderIndex < $1.orderIndex })) { objective in
                    ObjectiveRowView(objective: objective) {
                        toggleObjective(objective)
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                }
            }
        }
    }

    private func toggleObjective(_ objective: DailyObjectiveDTO) {
        guard let index = objectives.firstIndex(where: { $0.id == objective.id }) else { return }
        let newCompleted = !objective.isCompleted
        let original = objectives[index]

        objectives[index] = DailyObjectiveDTO(
            id: original.id,
            weeklyPlanId: original.weeklyPlanId,
            goalId: original.goalId,
            userId: original.userId,
            date: original.date,
            title: original.title,
            description: original.description,
            difficultyRating: original.difficultyRating,
            orderIndex: original.orderIndex,
            isCompleted: newCompleted,
            isFallback: original.isFallback,
            createdAt: original.createdAt
        )

        updateCachedObjective(id: objective.id, isCompleted: newCompleted)

        Task {
            do {
                let updated = try await RoadmapAPIService.shared.toggleObjective(
                    goalId: goalId,
                    objectiveId: objective.id,
                    isCompleted: newCompleted
                )
                if let idx = objectives.firstIndex(where: { $0.id == updated.id }) {
                    objectives[idx] = updated
                }
                updateCachedObjective(id: updated.id, isCompleted: updated.isCompleted)
            } catch {
                if let idx = objectives.firstIndex(where: { $0.id == original.id }) {
                    objectives[idx] = original
                }
                updateCachedObjective(id: original.id, isCompleted: original.isCompleted)
            }
        }
    }

    private func updateCachedObjective(id: String, isCompleted: Bool) {
        let descriptor = FetchDescriptor<LocalDailyObjective>(
            predicate: #Predicate { $0.id == id }
        )
        if let local = try? modelContext.fetch(descriptor).first {
            local.isCompleted = isCompleted
        }
    }

    private func loadAllData() async {
        let cachedObjectives = fetchCachedObjectives()
        if !cachedObjectives.isEmpty {
            objectives = cachedObjectives
            isLoading = false
        }

        if weeklyPlan == nil {
            weeklyPlan = fetchCachedWeeklyPlan()
        }

        if let cached = fetchCachedDebrief() {
            todayDebrief = cached
        }

        await syncCheckInsFromAPI()

        if hasCheckedIn {
            await loadPostCheckInData()
        }

        if let debriefs = try? await RoadmapAPIService.shared.getDebriefHistory(goalId: goalId) {
            let todayDebriefDTO = debriefs.first { $0.date == todayDateString }
            todayDebrief = todayDebriefDTO
            syncDebriefToCache(todayDebriefDTO)
        }

        isLoading = false
    }

    private func loadPostCheckInData() async {
        async let fetchPlan: () = loadWeeklyPlan()
        async let fetchObjectives: () = loadObjectives()
        _ = await(fetchPlan, fetchObjectives)
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
            roadmapId: local.roadmapId,
            milestoneId: local.milestoneId,
            goalId: local.goalId,
            userId: local.userId,
            weekNumber: local.weekNumber,
            weekStartDate: local.weekStartDate,
            focus: local.focus,
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
            existing.roadmapId = dto.roadmapId
            existing.milestoneId = dto.milestoneId
            existing.weekNumber = dto.weekNumber
            existing.weekStartDate = dto.weekStartDate
            existing.focus = dto.focus
            existing.objectives = dto.objectives
            existing.status = dto.status.rawValue
            existing.isFallback = dto.isFallback
            existing.summaryCompletionRate = dto.summary?.completionRate
            existing.summaryObjectivesCompleted = dto.summary?.objectivesCompleted
            existing.summaryObjectivesTotal = dto.summary?.objectivesTotal
            existing.summaryDebriefCount = dto.summary?.debriefCount
            existing.summaryNarrative = dto.summary?.narrative
        } else {
            let local = LocalWeeklyPlan(
                id: dto.id,
                roadmapId: dto.roadmapId,
                milestoneId: dto.milestoneId,
                goalId: dto.goalId,
                userId: dto.userId,
                weekNumber: dto.weekNumber,
                weekStartDate: dto.weekStartDate,
                focus: dto.focus,
                objectives: dto.objectives,
                status: dto.status.rawValue,
                isFallback: dto.isFallback,
                createdAt: dto.createdAt,
                summary: dto.summary
            )
            modelContext.insert(local)
        }
    }

    private func loadObjectives() async {
        let cachedObjectives = fetchCachedObjectives()
        if !cachedObjectives.isEmpty {
            objectives = cachedObjectives
        }

        if let fetched = try? await RoadmapAPIService.shared.getDailyObjectives(goalId: goalId) {
            let todayObjectives = fetched.filter { $0.date == todayDateString }
            objectives = todayObjectives
            syncObjectivesToCache(todayObjectives)
        }
    }

    private func fetchCachedObjectives() -> [DailyObjectiveDTO] {
        let goalId = goalId
        let today = todayDateString
        let descriptor = FetchDescriptor<LocalDailyObjective>(
            predicate: #Predicate { $0.goalId == goalId && $0.date == today },
            sortBy: [SortDescriptor(\.orderIndex)]
        )
        guard let cached = try? modelContext.fetch(descriptor), !cached.isEmpty else { return [] }
        return cached.map { local in
            DailyObjectiveDTO(
                id: local.id,
                weeklyPlanId: local.weeklyPlanId,
                goalId: local.goalId,
                userId: local.userId,
                date: local.date,
                title: local.title,
                description: local.objectiveDescription,
                difficultyRating: local.difficultyRating.flatMap { DifficultyRating(rawValue: $0) },
                orderIndex: local.orderIndex,
                isCompleted: local.isCompleted,
                isFallback: local.isFallback,
                createdAt: local.createdAt
            )
        }
    }

    private func syncCheckInsFromAPI() async {
        guard let checkIns = try? await RoadmapAPIService.shared.getCheckInHistory(goalId: goalId) else { return }
        syncCheckInsToCache(checkIns)
    }

    private func syncCheckInsToCache(_ dtos: [CheckInDTO]) {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalCheckIn>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? modelContext.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })
        let remoteIds = Set(dtos.map(\.id))

        for dto in dtos {
            if let local = existingById[dto.id] {
                local.date = dto.date
                local.energyLevel = dto.energyLevel.rawValue
                local.note = dto.note
            } else {
                let local = LocalCheckIn(
                    id: dto.id,
                    goalId: dto.goalId,
                    userId: dto.userId,
                    date: dto.date,
                    energyLevel: dto.energyLevel.rawValue,
                    note: dto.note,
                    createdAt: dto.createdAt
                )
                modelContext.insert(local)
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            modelContext.delete(local)
        }
    }

    private func fetchCachedDebrief() -> DebriefDTO? {
        let goalId = goalId
        let today = todayDateString
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.goalId == goalId && $0.date == today }
        )
        guard let local = try? modelContext.fetch(descriptor).first else { return nil }
        let taskRatings: [TaskRatingDTO] = local.taskRatingsJSON
            .flatMap { try? JSONDecoder().decode([TaskRatingDTO].self, from: $0) } ?? []
        return DebriefDTO(
            id: local.id,
            goalId: local.goalId,
            userId: local.userId,
            date: local.date,
            note: local.note,
            taskRatings: taskRatings,
            createdAt: local.createdAt
        )
    }

    private func syncDebriefToCache(_ dto: DebriefDTO?) {
        let goalId = goalId
        let today = todayDateString
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.goalId == goalId && $0.date == today }
        )
        let existing = try? modelContext.fetch(descriptor).first

        guard let dto else {
            if let existing {
                modelContext.delete(existing)
            }
            return
        }

        let ratingsData = try? JSONEncoder().encode(dto.taskRatings)

        if let existing {
            existing.note = dto.note
            existing.taskRatingsJSON = ratingsData
        } else {
            let local = LocalDebrief(
                id: dto.id,
                goalId: dto.goalId,
                userId: dto.userId,
                date: dto.date,
                note: dto.note,
                taskRatingsJSON: ratingsData,
                createdAt: dto.createdAt
            )
            modelContext.insert(local)
        }
    }

    private func syncObjectivesToCache(_ dtos: [DailyObjectiveDTO]) {
        let goalId = goalId
        let today = todayDateString
        let descriptor = FetchDescriptor<LocalDailyObjective>(
            predicate: #Predicate { $0.goalId == goalId && $0.date == today }
        )
        let existing = (try? modelContext.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })
        let remoteIds = Set(dtos.map(\.id))

        for dto in dtos {
            if let local = existingById[dto.id] {
                local.weeklyPlanId = dto.weeklyPlanId
                local.title = dto.title
                local.objectiveDescription = dto.description
                local.difficultyRating = dto.difficultyRating?.rawValue
                local.orderIndex = dto.orderIndex
                local.isCompleted = dto.isCompleted
                local.isFallback = dto.isFallback
            } else {
                let local = LocalDailyObjective(
                    id: dto.id,
                    weeklyPlanId: dto.weeklyPlanId,
                    goalId: dto.goalId,
                    userId: dto.userId,
                    date: dto.date,
                    title: dto.title,
                    objectiveDescription: dto.description,
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
        .modelContainer(for: [LocalGoal.self, LocalDailyObjective.self, LocalCheckIn.self, LocalWeeklyPlan.self, LocalDebrief.self], inMemory: true)
}
