import SwiftData
import SwiftUI

struct ProfileGateView: View {
    let userId: String

    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject private var permissionCoordinator: PermissionPromptCoordinator
    @EnvironmentObject private var deepLinkRouter: DeepLinkRouter

    @Query private var localProfiles: [LocalProfile]
    @Query private var localGoals: [LocalGoal]

    @State private var hasSynced = false
    @State private var profileComplete = false
    @State private var goalComplete = false
    @State private var roadmapReady = false
    @State private var activeGoalId: String?
    @State private var selectedTab = 0
    @State private var isChatPresented = false
    @State private var connectionError = false
    @State private var retryId = 0
    @State private var showWhyAlert = false

    private var localProfile: LocalProfile? {
        localProfiles.first { $0.userId == userId }
    }

    var body: some View {
        Group {
            if goalComplete && roadmapReady {
                PaywallGateView {
                    TabView(selection: $selectedTab) {
                        Tab(value: 0) {
                            HomeView(goalId: activeGoalId ?? "", firstName: localProfile?.firstName ?? "")
                        } label: {
                            TablerTabLabel(.home, title: String(localized: "tabs.home", table: "Common"))
                        }

                        Tab(value: 1) {
                            RoadmapView(goalId: activeGoalId ?? "", onGoalChanged: handleGoalChanged)
                        } label: {
                            TablerTabLabel(.map, title: String(localized: "tabs.roadmap", table: "Common"))
                        }

                        Tab(value: 2) {
                            StatsView(goalId: activeGoalId ?? "")
                        } label: {
                            TablerTabLabel(.chartBar, title: String(localized: "tabs.stats", table: "Common"))
                        }

                        Tab(value: 3) {
                            SettingsView(onNewGoal: { goalId in
                                activeGoalId = goalId
                                withAnimation(.easeInOut(duration: 0.4)) {
                                    goalComplete = true
                                    roadmapReady = false
                                }
                            }, onDeleteGoal: {
                                activeGoalId = nil
                                withAnimation(.easeInOut(duration: 0.4)) {
                                    goalComplete = false
                                    roadmapReady = false
                                }
                            })
                        } label: {
                            TablerTabLabel(.settings, title: String(localized: "tabs.settings", table: "Common"))
                        }

                        Tab(value: 4, role: .search) {
                            Color.clear
                        } label: {
                            TablerTabLabel(.brain, title: String(localized: "tabs.chat", table: "Common"))
                        }
                    }
                    .labelStyle(.titleAndIcon)
                    .overlay(alignment: .top) {
                        ProgressiveBlur()
                    }
                    .onChange(of: selectedTab) { oldValue, newValue in
                        if newValue == 4 {
                            selectedTab = oldValue
                            isChatPresented = true
                        }
                    }
                    .fullScreenCover(isPresented: $isChatPresented) {
                        ChatView(goalId: activeGoalId ?? "", onClose: {
                            isChatPresented = false
                        })
                    }
                }
                .transition(.opacity)
            } else if goalComplete && !roadmapReady {
                RoadmapGenerationView(goalId: activeGoalId ?? "") {
                    withAnimation(.easeInOut(duration: 0.4)) {
                        roadmapReady = true
                        if let goal = localGoals.first(where: { $0.id == activeGoalId }) {
                            goal.status = "active"
                        }
                    }
                }
                .transition(.opacity)
            } else if profileComplete {
                PaywallGateView {
                    GoalIntakeFlowView(
                        userId: userId,
                        existingGoalId: activeGoalId,
                        onClose: nil,
                        onComplete: { goalId in
                            activeGoalId = goalId

                            withAnimation(.easeInOut(duration: 0.4)) {
                                goalComplete = true
                            }
                        }
                    )
                }
                .transition(.opacity)
            } else if hasSynced {
                ProfileOnboardingView(
                    userId: userId,
                    missingSteps: localProfile?.missingOnboardingSteps ?? [.name, .birthdate, .coach],
                    existingProfile: localProfile,
                    onComplete: {
                        withAnimation(.easeInOut(duration: 0.4)) {
                            profileComplete = true
                        }
                    }
                )
                .transition(.opacity)
            } else if connectionError {
                VStack(spacing: 24) {
                    TablerIcons(.wifiOff, size: 48, color: Color("TextSecondary"))

                    AppText("common.error.noConnection", table: "Common", style: .title)
                        .alignment(.center)

                    AppText("common.error.noConnectionMessage", table: "Common", style: .body)
                        .color(Color("TextSecondary"))
                        .alignment(.center)

                    AppButton("common.retry", table: "Common") {
                        retry()
                    }
                }
                .padding(32)
            } else {
                ProgressView()
            }
        }
        .task(id: retryId) {
            guard !hasSynced else { return }
            connectionError = false
            let locallyComplete = localProfile?.isProfileComplete == true
            if locallyComplete {
                profileComplete = true
                resolveGoalState()
            }
            do {
                try await ProfileSyncService.shared.sync(userId: userId, in: modelContext)
            } catch {
                connectionError = true
                return
            }
            await syncGoals()
            let remoteComplete = localProfile?.isProfileComplete == true
            if locallyComplete && !remoteComplete {
                profileComplete = false
                goalComplete = false
                roadmapReady = false
                activeGoalId = nil
            } else if remoteComplete {
                profileComplete = true
                resolveGoalState()
                if goalComplete,
                   let goal = localGoals.first(where: { $0.id == activeGoalId }),
                   goal.status == ProfileStatus.intakeCompleted.rawValue
                {
                    let checkedGoalId = goal.id
                    let hasRoadmap = await checkRoadmapStatus(goalId: checkedGoalId)
                    if activeGoalId == checkedGoalId {
                        roadmapReady = hasRoadmap
                    }
                }
            }
            hasSynced = true
            permissionCoordinator.updateFromProfile(
                userId: userId,
                status: localProfile?.notifPermissionStatus,
                accountCreatedAt: localProfile?.createdAt
            )
            permissionCoordinator.tryTriggerFallback()
            handleDeepLinkRoute(deepLinkRouter.pendingRoute)
        }
        .onChange(of: localProfile?.notifPermissionStatus) { _, newStatus in
            permissionCoordinator.updateFromProfile(
                userId: userId,
                status: newStatus,
                accountCreatedAt: localProfile?.createdAt
            )
        }
        .onChange(of: deepLinkRouter.pendingRoute) { _, route in
            handleDeepLinkRoute(route)
        }
        .alert(
            String(localized: "notifications.why.title", table: "Notifications"),
            isPresented: $showWhyAlert
        ) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            Text(String(localized: "notifications.why.body", table: "Notifications"))
        }
    }

    private func handleDeepLinkRoute(_ route: DeepLinkRoute?) {
        guard let route else { return }
        switch route {
        case .coachReply:
            isChatPresented = true
        case .task:
            selectedTab = 1
        case .notifWhy:
            showWhyAlert = true
        case .unknown:
            break
        }
        _ = deepLinkRouter.consume()
    }

    private func syncGoals() async {
        guard let goals = try? await GoalAPIService.shared.listGoals() else { return }
        let remoteIds = Set(goals.map { $0.id })
        for dto in goals {
            let descriptor = FetchDescriptor<LocalGoal>(predicate: #Predicate { goal in
                goal.id == dto.id
            })
            let existing = try? modelContext.fetch(descriptor).first
            if let existing {
                existing.status = dto.status
                existing.title = dto.title
                existing.goalDescription = dto.description
            } else {
                let localGoal = LocalGoal(
                    id: dto.id,
                    userId: dto.userId,
                    title: dto.title,
                    goalDescription: dto.description,
                    status: dto.status,
                    createdAt: Date()
                )
                modelContext.insert(localGoal)
            }
        }
        let stale = localGoals.filter {
            $0.userId.caseInsensitiveCompare(userId) == .orderedSame && !remoteIds.contains($0.id)
        }
        for goal in stale {
            modelContext.delete(goal)
        }
    }

    private func resolveGoalState() {
        let userGoals = localGoals.filter { $0.userId.caseInsensitiveCompare(userId) == .orderedSame }
        let statusPriority = ["active", "intake_completed", "profile_generating", "intake_in_progress"]
        let matchingGoal = userGoals
            .sorted { a, b in
                let aIndex = statusPriority.firstIndex(of: a.status) ?? statusPriority.count
                let bIndex = statusPriority.firstIndex(of: b.status) ?? statusPriority.count
                return aIndex < bIndex
            }
            .first
        activeGoalId = matchingGoal?.id

        guard let status = matchingGoal?.status else {
            goalComplete = false
            roadmapReady = false
            return
        }

        switch status {
        case "active":
            goalComplete = true
            roadmapReady = true
        case ProfileStatus.intakeCompleted.rawValue:
            goalComplete = true
            roadmapReady = false
        case "intake_in_progress", "profile_generating", ProfileStatus.generationFailed.rawValue:
            goalComplete = false
            roadmapReady = false
        default:
            goalComplete = false
            roadmapReady = false
        }
    }

    private func checkRoadmapStatus(goalId: String) async -> Bool {
        guard let roadmap = try? await RoadmapAPIService.shared.getRoadmap(goalId: goalId) else {
            return false
        }
        return roadmap.status == .complete
    }

    private func retry() {
        hasSynced = false
        retryId += 1
    }

    private func handleGoalChanged(_ newGoalId: String) {
        guard newGoalId != activeGoalId else { return }
        activeGoalId = newGoalId
        guard let goal = localGoals.first(where: { $0.id == newGoalId }) else { return }

        switch goal.status {
        case "active":
            withAnimation(.easeInOut(duration: 0.4)) {
                goalComplete = true
                roadmapReady = true
            }
        case ProfileStatus.intakeCompleted.rawValue:
            withAnimation(.easeInOut(duration: 0.4)) {
                goalComplete = true
                roadmapReady = false
            }
            Task {
                let hasRoadmap = await checkRoadmapStatus(goalId: newGoalId)
                guard activeGoalId == newGoalId else { return }
                withAnimation(.easeInOut(duration: 0.4)) {
                    roadmapReady = hasRoadmap
                }
            }
        default:
            withAnimation(.easeInOut(duration: 0.4)) {
                goalComplete = false
                roadmapReady = false
            }
        }
    }
}

#Preview {
    ProfileGateView(userId: "preview-user")
        .environmentObject(AuthService.shared)
        .modelContainer(for: [LocalProfile.self, LocalGoal.self, LocalRoadmap.self, LocalMilestone.self, LocalWeeklyPlan.self, LocalWeeklyTask.self], inMemory: true)
}
