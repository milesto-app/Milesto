import SwiftData
import SwiftUI

enum GoalIntakeStep {
    case goalSetup
    case motivation(goalId: String)
    case intake(goalId: String)
}

struct GoalIntakeFlowView: View {
    let userId: String
    let existingGoalId: String?
    let onClose: (() -> Void)?
    let onComplete: (String) -> Void

    @Environment(\.modelContext) private var modelContext
    @State private var step: GoalIntakeStep = .goalSetup
    @State private var goalDescription = ""
    @State private var motivationQuote = ""
    @State private var isCreatingGoal = false
    @State private var isSavingMotivation = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            Group {
                switch step {
                case .goalSetup:
                    GoalSetupView(
                        goalDescription: $goalDescription,
                        isLoading: isCreatingGoal,
                        onContinue: createGoal
                    )
                case let .motivation(goalId):
                    OnboardingMotivationView(
                        motivationQuote: $motivationQuote,
                        isSaving: isSavingMotivation,
                        onContinue: { saveMotivation(goalId: goalId) },
                        onSkip: { advanceToIntake(goalId: goalId) }
                    )
                case let .intake(goalId):
                    IntakeContainerView(goalId: goalId, onComplete: {
                        markGoalCompleted(goalId: goalId)
                        onComplete(goalId)
                    })
                }
            }
            .overlay(alignment: .topTrailing) {
                if let onClose {
                    Button(action: onClose) {
                        TablerIcons(.x, size: 24, color: Color("TextPrimary"))
                            .frame(width: 44, height: 44)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .padding(.top, 8)
                    .padding(.trailing, 16)
                }
            }
            .overlay(alignment: .topLeading) {
                OnboardingSignOutButton()
                    .padding(.top, 8)
                    .padding(.leading, 16)
            }
        }
        .onAppear {
            if let existingGoalId {
                step = .intake(goalId: existingGoalId)
            }
        }
        .alert(String(localized: "intake.error.title", table: "Intake"), isPresented: $showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private func markGoalCompleted(goalId: String) {
        let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { goal in
            goal.id == goalId
        })
        if let goal = try? modelContext.fetch(descriptor).first {
            goal.status = ProfileStatus.intakeCompleted.rawValue
        }
    }

    private func createGoal() {
        Task { @MainActor in
            isCreatingGoal = true
            defer { isCreatingGoal = false }

            do {
                let goal = try await GoalAPIService.shared.createGoal(
                    description: goalDescription.trimmingCharacters(in: .whitespacesAndNewlines)
                )

                let localGoal = Goal(
                    id: goal.id,
                    userId: goal.userId,
                    title: goal.title,
                    goalDescription: goal.goalDescription,
                    status: goal.status,
                    createdAt: Date()
                )
                modelContext.insert(localGoal)

                withAnimation(.easeInOut(duration: 0.3)) {
                    step = .motivation(goalId: goal.id)
                }
            } catch BackendError.subscriptionRequired {
                // PaywallGateView will redirect to the paywall — no alert needed.
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    private func saveMotivation(goalId: String) {
        Task { @MainActor in
            isSavingMotivation = true
            defer { isSavingMotivation = false }

            let trimmed = motivationQuote.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else {
                advanceToIntake(goalId: goalId)
                return
            }

            do {
                try await GoalAPIService.shared.updateGoal(goalId: goalId, motivationQuote: trimmed)
                advanceToIntake(goalId: goalId)
            } catch BackendError.subscriptionRequired {
                // PaywallGateView will redirect to the paywall — no alert needed.
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    private func advanceToIntake(goalId: String) {
        withAnimation(.easeInOut(duration: 0.3)) {
            step = .intake(goalId: goalId)
        }
    }
}
