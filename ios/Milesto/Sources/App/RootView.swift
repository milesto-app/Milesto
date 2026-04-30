import SwiftData
import SwiftUI

struct RootView: View {
    @Environment(SupabaseAuthRepository.self) private var authService
    @Environment(\.modelContext) private var modelContext

    @State private var routing = RootRoutingViewModel()
    @State private var selectedTab = 0
    @State private var isChatPresented = false
    @State private var retryId = 0
    #if DEBUG
        @State private var developerSettings = DeveloperSettings.shared
    #endif

    var body: some View {
        Group {
            switch authService.authState {
            case .unauthenticated, .error:
                AuthContainerView()
            case .authenticating:
                Color("BackgroundBase").ignoresSafeArea()
            case let .authenticated(userId):
                authenticatedBody(userId: userId)
            }
        }
        #if DEBUG
        .clearsDeveloperOverrideOnShake(developerSettings)
        #endif
    }

    private func authenticatedBody(userId: String) -> some View {
        Group {
            #if DEBUG
                switch developerSettings.routeOverride {
                case .profileOnboarding:
                    ProfileOnboardingView(
                        userId: userId,
                        missingSteps: [.name, .birthdate, .coach],
                        existingProfile: routing.localProfile,
                        onComplete: {
                            developerSettings.clearRouteOverride()
                        }
                    )
                    .transition(.opacity)
                case .goalIntake:
                    GoalIntakeFlowView(
                        userId: userId,
                        existingGoalId: nil,
                        onClose: {
                            developerSettings.clearRouteOverride()
                        },
                        onComplete: { goalId in
                            routing.activeGoalId = goalId
                            developerSettings.clearRouteOverride()
                        }
                    )
                    .transition(.opacity)
                case .roadmapGeneration:
                    RoadmapGenerationView(goalId: routing.activeGoalId ?? "") {
                        developerSettings.clearRouteOverride()
                    }
                    .transition(.opacity)
                case .paywall, .none:
                    standardAuthenticatedBody(userId: userId)
                }
            #else
                standardAuthenticatedBody(userId: userId)
            #endif
        }
        .task(id: retryId) {
            guard !routing.hasSynced else { return }
            await routing.sync(userId: userId, modelContext: modelContext)
        }
    }

    private func standardAuthenticatedBody(userId: String) -> some View {
        Group {
            if routing.profileComplete {
                PaywallGateView {
                    postProfileFlow(userId: userId)
                }
                .transition(.opacity)
            } else if routing.hasSynced {
                ProfileOnboardingView(
                    userId: userId,
                    missingSteps: routing.localProfile?.missingOnboardingSteps ?? [.name, .birthdate, .coach],
                    existingProfile: routing.localProfile,
                    onComplete: {
                        withAnimation(.easeInOut(duration: 0.4)) {
                            routing.profileComplete = true
                        }
                    }
                )
                .transition(.opacity)
            } else if routing.connectionError {
                VStack(spacing: 24) {
                    TablerIcons(.wifiOff, size: 48, color: Color("TextSecondary"))

                    AppText("common.error.noConnection", table: "Common", style: .title)
                        .alignment(.center)

                    AppText("common.error.noConnectionMessage", table: "Common", style: .body)
                        .color(Color("TextSecondary"))
                        .alignment(.center)

                    AppButton("common.retry", table: "Common") {
                        routing.resetForRetry()
                        retryId += 1
                    }
                }
                .padding(32)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
    }

    @ViewBuilder
    private func postProfileFlow(userId: String) -> some View {
        if routing.goalComplete && routing.roadmapReady {
            mainAppContent()
        } else if routing.goalComplete {
            RoadmapGenerationView(goalId: routing.activeGoalId ?? "") {
                withAnimation(.easeInOut(duration: 0.4)) {
                    routing.markRoadmapReady(in: modelContext)
                }
            }
        } else {
            GoalIntakeFlowView(
                userId: userId,
                existingGoalId: routing.activeGoalId,
                onClose: nil,
                onComplete: { goalId in
                    routing.activeGoalId = goalId

                    withAnimation(.easeInOut(duration: 0.4)) {
                        routing.goalComplete = true
                    }
                }
            )
        }
    }

    private func mainAppContent() -> some View {
        TabView(selection: $selectedTab) {
            Tab(value: 0) {
                HomeView(goalId: routing.activeGoalId ?? "", firstName: routing.localProfile?.firstName ?? "")
            } label: {
                TablerTabLabel(.home, title: String(localized: "tabs.home", table: "Common"))
            }

            Tab(value: 1) {
                RoadmapView(goalId: routing.activeGoalId ?? "", onGoalChanged: { id in
                    routing.handleGoalChanged(id, in: modelContext)
                })
            } label: {
                TablerTabLabel(.map, title: String(localized: "tabs.roadmap", table: "Common"))
            }

            Tab(value: 2) {
                StatsView(goalId: routing.activeGoalId ?? "")
            } label: {
                TablerTabLabel(.chartBar, title: String(localized: "tabs.stats", table: "Common"))
            }

            Tab(value: 3) {
                SettingsView(onNewGoal: { goalId in
                    routing.activeGoalId = goalId
                    withAnimation(.easeInOut(duration: 0.4)) {
                        routing.goalComplete = true
                        routing.roadmapReady = false
                    }
                }, onDeleteGoal: {
                    routing.activeGoalId = nil
                    withAnimation(.easeInOut(duration: 0.4)) {
                        routing.goalComplete = false
                        routing.roadmapReady = false
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
            ChatView(goalId: routing.activeGoalId ?? "", onClose: {
                isChatPresented = false
            })
        }
    }
}

#Preview {
    RootView()
        .environment(SupabaseAuthRepository.shared)
        .modelContainer(for: [Profile.self, Goal.self, LocalRoadmap.self, LocalMilestone.self, LocalWeeklyPlan.self, LocalWeeklyTask.self], inMemory: true)
}
