import SwiftUI

struct AppView: View {
    @Environment(AppEnv.self) private var dependencies

    @State private var routing: AppViewModel?
    @State private var selectedTab = 0
    @State private var isChatPresented = false
    @State private var retryId = 0

    var body: some View {
        Group {
            switch dependencies.auth.authState {
            case .unauthenticated, .error:
                AuthContainerView()
            case .authenticating:
                Color("BackgroundBase").ignoresSafeArea()
            case let .authenticated(userId):
                authenticatedBody(userId: userId)
            }
        }
        .appBackground()
        .onAppear {
            if routing == nil {
                routing = AppViewModel(
                    profile: dependencies.profile,
                    goals: dependencies.goalRouting,
                    roadmap: dependencies.roadmap
                )
            }
        }
        #if DEBUG
        .showsDeveloperRouteMenuOnShake(dependencies.developerSettings)
        #endif
    }

    @ViewBuilder
    private func authenticatedBody(userId: String) -> some View {
        if let routing {
            Group {
                #if DEBUG
                    switch dependencies.developerSettings.routeOverride {
                    case .profileOnboarding:
                        ProfileOnboardingView(
                            userId: userId,
                            missingSteps: [.name, .birthdate, .coach],
                            existingProfile: routing.localProfile,
                            onComplete: {
                                dependencies.developerSettings.clearRouteOverride()
                            }
                        )
                        .transition(.opacity)
                    case .goalIntake:
                        GoalIntakeFlowView(
                            existingGoalId: nil,
                            onClose: {
                                dependencies.developerSettings.clearRouteOverride()
                            },
                            onComplete: { goalId in
                                routing.activeGoalId = goalId
                                dependencies.developerSettings.clearRouteOverride()
                            }
                        )
                        .transition(.opacity)
                    case .roadmapGeneration:
                        RoadmapGenerationView(goalId: routing.activeGoalId ?? "") {
                            dependencies.developerSettings.clearRouteOverride()
                        }
                        .transition(.opacity)
                    case .paywall, .none:
                        standardAuthenticatedBody(userId: userId, routing: routing)
                    }
                #else
                    standardAuthenticatedBody(userId: userId, routing: routing)
                #endif
            }
            .task(id: retryId) {
                guard !routing.hasSynced else { return }
                await routing.sync(userId: userId)
            }
        } else {
            Color("BackgroundBase").ignoresSafeArea()
        }
    }

    private func standardAuthenticatedBody(userId: String, routing: AppViewModel) -> some View {
        Group {
            if routing.profileComplete {
                SubscriptionGateView {
                    postProfileFlow(routing: routing)
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

    private func postProfileFlow(routing: AppViewModel) -> some View {
        Group {
            if routing.goalComplete && routing.roadmapReady {
                mainAppContent(routing: routing)
            } else if routing.goalComplete {
                RoadmapGenerationView(goalId: routing.activeGoalId ?? "") {
                    withAnimation(.easeInOut(duration: 0.4)) {
                        routing.markRoadmapReady()
                    }
                }
            } else {
                GoalIntakeFlowView(
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
        .animation(.easeInOut(duration: 0.4), value: routing.goalComplete)
        .animation(.easeInOut(duration: 0.4), value: routing.roadmapReady)
    }

    private func mainAppContent(routing: AppViewModel) -> some View {
        TabView(selection: $selectedTab) {
            Tab(value: 0) {
                HomeView(goalId: routing.activeGoalId ?? "")
            } label: {
                TablerTabLabel(.home, title: String(localized: "tabs.home", table: "Common"))
            }

            Tab(value: 1) {
                RoadmapView(goalId: routing.activeGoalId ?? "")
            } label: {
                TablerTabLabel(.map, title: String(localized: "tabs.roadmap", table: "Common"))
            }

            Tab(value: 2) {
                StatsView(goalId: routing.activeGoalId ?? "")
            } label: {
                TablerTabLabel(.chartBar, title: String(localized: "tabs.stats", table: "Common"))
            }

            Tab(value: 3) {
                SettingsView(onDeleteGoal: {
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
            .appPresentationBackground()
        }
    }
}
