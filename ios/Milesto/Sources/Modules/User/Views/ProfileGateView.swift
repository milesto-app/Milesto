import SwiftData
import SwiftUI

struct ProfileGateView: View {
    let userId: String

    @Environment(\.modelContext) private var modelContext

    @Query private var localProfiles: [Profile]
    @Query private var localGoals: [Goal]

    @State private var gate = ProfileGate()
    @State private var selectedTab = 0
    @State private var isChatPresented = false
    @State private var retryId = 0

    private var localProfile: Profile? {
        localProfiles.first { $0.userId == userId }
    }

    var body: some View {
        Group {
            if gate.goalComplete && gate.roadmapReady {
                PaywallGateView {
                    TabView(selection: $selectedTab) {
                        Tab(value: 0) {
                            HomeView(goalId: gate.activeGoalId ?? "", firstName: localProfile?.firstName ?? "")
                        } label: {
                            TablerTabLabel(.home, title: String(localized: "tabs.home", table: "Common"))
                        }

                        Tab(value: 1) {
                            RoadmapView(goalId: gate.activeGoalId ?? "", onGoalChanged: { id in
                                gate.handleGoalChanged(id, localGoals: localGoals)
                            })
                        } label: {
                            TablerTabLabel(.map, title: String(localized: "tabs.roadmap", table: "Common"))
                        }

                        Tab(value: 2) {
                            StatsView(goalId: gate.activeGoalId ?? "")
                        } label: {
                            TablerTabLabel(.chartBar, title: String(localized: "tabs.stats", table: "Common"))
                        }

                        Tab(value: 3) {
                            SettingsView(onNewGoal: { goalId in
                                gate.activeGoalId = goalId
                                withAnimation(.easeInOut(duration: 0.4)) {
                                    gate.goalComplete = true
                                    gate.roadmapReady = false
                                }
                            }, onDeleteGoal: {
                                gate.activeGoalId = nil
                                withAnimation(.easeInOut(duration: 0.4)) {
                                    gate.goalComplete = false
                                    gate.roadmapReady = false
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
                        ChatView(goalId: gate.activeGoalId ?? "", onClose: {
                            isChatPresented = false
                        })
                    }
                }
                .transition(.opacity)
            } else if gate.goalComplete && !gate.roadmapReady {
                PaywallGateView {
                    RoadmapGenerationView(goalId: gate.activeGoalId ?? "") {
                        withAnimation(.easeInOut(duration: 0.4)) {
                            gate.roadmapReady = true
                            if let goal = localGoals.first(where: { $0.id == gate.activeGoalId }) {
                                goal.status = "active"
                            }
                        }
                    }
                }
                .transition(.opacity)
            } else if gate.profileComplete {
                PaywallGateView {
                    GoalIntakeFlowView(
                        userId: userId,
                        existingGoalId: gate.activeGoalId,
                        onClose: nil,
                        onComplete: { goalId in
                            gate.activeGoalId = goalId

                            withAnimation(.easeInOut(duration: 0.4)) {
                                gate.goalComplete = true
                            }
                        }
                    )
                }
                .transition(.opacity)
            } else if gate.hasSynced {
                ProfileOnboardingView(
                    userId: userId,
                    missingSteps: localProfile?.missingOnboardingSteps ?? [.name, .birthdate, .coach],
                    existingProfile: localProfile,
                    onComplete: {
                        withAnimation(.easeInOut(duration: 0.4)) {
                            gate.profileComplete = true
                        }
                    }
                )
                .transition(.opacity)
            } else if gate.connectionError {
                VStack(spacing: 24) {
                    TablerIcons(.wifiOff, size: 48, color: Color("TextSecondary"))

                    AppText("common.error.noConnection", table: "Common", style: .title)
                        .alignment(.center)

                    AppText("common.error.noConnectionMessage", table: "Common", style: .body)
                        .color(Color("TextSecondary"))
                        .alignment(.center)

                    AppButton("common.retry", table: "Common") {
                        gate.resetForRetry()
                        retryId += 1
                    }
                }
                .padding(32)
            } else {
                ProgressView()
            }
        }
        .task(id: retryId) {
            guard !gate.hasSynced else { return }
            await gate.sync(userId: userId, modelContext: modelContext, localProfile: localProfile, localGoals: localGoals)
        }
    }
}

#Preview {
    ProfileGateView(userId: "preview-user")
        .environment(AuthService.shared)
        .modelContainer(for: [Profile.self, Goal.self, LocalRoadmap.self, LocalMilestone.self, LocalWeeklyPlan.self, LocalWeeklyTask.self], inMemory: true)
}
