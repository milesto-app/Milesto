import SwiftUI

struct AppView: View {
    @Environment(AppEnv.self) private var env

    var body: some View {
        Group {
            switch env.auth.status {
            case .unauthenticated, .error:
                AuthContainerView()
            case .authenticating:
                Color("BackgroundPrimary").ignoresSafeArea()
            case let .authenticated(userId):
                AuthenticatedRootView(userId: userId)
                    .id(userId)
            }
        }
        .appBackground()
        .onOpenURL { url in
            Task {
                await env.auth.handleAuthCallback(url)
            }
        }
    }
}

private struct AuthenticatedRootView: View {
    let userId: String

    @Environment(AppEnv.self) private var env

    @State private var routing: AppViewModel?
    @State private var selectedTab = 0
    @State private var isChatPresented = false
    @State private var retryId = 0

    var body: some View {
        Group {
            if let routing {
                standardAuthenticatedBody(routing: routing)
                    .task(id: retryId) {
                        guard !routing.hasSynced else { return }
                        await routing.sync(userId: userId)
                    }
            } else {
                Color("BackgroundPrimary").ignoresSafeArea()
            }
        }
        .onAppear {
            if routing == nil {
                routing = AppViewModel(env: env)
            }
        }
    }

    private func standardAuthenticatedBody(routing: AppViewModel) -> some View {
        Group {
            if routing.profileComplete {
                startingView {
                    SubscriptionGateView {
                        postProfileFlow(routing: routing)
                    }
                }
                .transition(.opacity)
            } else if routing.hasSynced {
                startingView {
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
                }
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
                Color("BackgroundPrimary").ignoresSafeArea()
            }
        }
    }

    private func postProfileFlow(routing: AppViewModel) -> some View {
        Group {
            if routing.goalComplete && routing.roadmapReady {
                startingView {
                    mainAppContent(routing: routing)
                }
            } else if routing.goalComplete {
                startingView {
                    RoadmapGenerationView(goalId: routing.activeGoalId ?? "") {
                        withAnimation(.easeInOut(duration: 0.4)) {
                            routing.markRoadmapReady()
                        }
                    }
                }
            } else {
                startingView {
                    IntakeFlowView(
                        existingGoalId: routing.activeGoalId,
                        onComplete: { goalId in
                            routing.activeGoalId = goalId
                            withAnimation(.easeInOut(duration: 0.4)) {
                                routing.goalComplete = true
                            }
                        },
                        onStartOver: {
                            routing.activeGoalId = nil
                        }
                    )
                }
            }
        }
        .animation(.easeInOut(duration: 0.4), value: routing.goalComplete)
        .animation(.easeInOut(duration: 0.4), value: routing.roadmapReady)
    }

    private func startingView<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .appStartTransition()
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
