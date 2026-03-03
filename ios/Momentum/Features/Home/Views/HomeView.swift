import SwiftUI
import SwiftData

struct HomeView: View {
    let goalId: String
    let firstName: String

    @Query private var localGoals: [LocalGoal]
    @State private var checkIn: CheckInDTO?
    @State private var weeklyPlan: WeeklyPlanDTO?
    @State private var objectives: [DailyObjectiveDTO] = []
    @State private var todayDebrief: DebriefDTO?
    @State private var isLoading = true
    @State private var showDebriefSheet = false
    @State private var hasCheckedIn = false
    @State private var showWeeklyPlanDetail = false

    private var currentGoal: LocalGoal? {
        localGoals.first { $0.id == goalId }
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
            guard isLoading else { return }
            await loadAllData()
        }
        .onChange(of: goalId) {
            objectives = []
            checkIn = nil
            weeklyPlan = nil
            todayDebrief = nil
            hasCheckedIn = false
            isLoading = true
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
                        todayDebrief = try? await RoadmapAPIService.shared.getDebriefHistory(goalId: goalId)
                            .first { $0.date == todayDateString }
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
                .color(AppTheme.Colors.textSecondary)
                Spacer()
                AppText(verbatim: formattedDate, style: .caption)
                    .color(AppTheme.Colors.textSecondary)
            }

            AppText(verbatim: currentGoal?.title ?? "", style: .title)

            VStack(alignment: .leading, spacing: 8) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(AppTheme.Colors.textSecondary.opacity(0.1))
                            .frame(height: 8)
                        Capsule()
                            .fill(AppTheme.Colors.accent)
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
                    .color(AppTheme.Colors.accent)
                    Spacer()
                }
            }
        }
        .padding(24)
        .glassEffect(.clear.interactive(), in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.xl))
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
                        withAnimation(.easeOut(duration: 0.3)) {
                            hasCheckedIn = true
                        }
                        Task {
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
                    .color(AppTheme.Colors.accent)
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
                .color(AppTheme.Colors.textSecondary)
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
            } catch {
                if let idx = objectives.firstIndex(where: { $0.id == original.id }) {
                    objectives[idx] = original
                }
            }
        }
    }

    private func loadAllData() async {
        do {
            let checkIns = try await RoadmapAPIService.shared.getCheckInHistory(goalId: goalId)
            let todayCheckIn = checkIns.first { $0.date == todayDateString }
            checkIn = todayCheckIn
            hasCheckedIn = todayCheckIn != nil

            if hasCheckedIn {
                await loadPostCheckInData()
            }

            let debriefs = try await RoadmapAPIService.shared.getDebriefHistory(goalId: goalId)
            todayDebrief = debriefs.first { $0.date == todayDateString }
        } catch {}
        isLoading = false
    }

    private func loadPostCheckInData() async {
        async let fetchPlan: () = loadWeeklyPlan()
        async let fetchObjectives: () = loadObjectives()
        _ = await (fetchPlan, fetchObjectives)
    }

    private func loadWeeklyPlan() async {
        if let existing = try? await RoadmapAPIService.shared.getWeeklyPlan(goalId: goalId) {
            weeklyPlan = existing
            return
        }
        weeklyPlan = try? await RoadmapAPIService.shared.generateWeeklyPlan(goalId: goalId)
    }

    private func loadObjectives() async {
        if let fetched = try? await RoadmapAPIService.shared.getDailyObjectives(goalId: goalId) {
            objectives = fetched.filter { $0.date == todayDateString }
        }
    }
}

#Preview {
    HomeView(goalId: "preview-goal", firstName: "Maty")
        .modelContainer(for: [LocalGoal.self], inMemory: true)
}
