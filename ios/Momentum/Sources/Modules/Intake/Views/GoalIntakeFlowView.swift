import SwiftData
import SwiftUI

enum GoalIntakeStep {
    case goalSetup
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
    @State private var isCreatingGoal = false
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
        let descriptor = FetchDescriptor<LocalGoal>(predicate: #Predicate { goal in
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

                let localGoal = LocalGoal(
                    id: goal.id,
                    userId: goal.userId,
                    title: goal.title,
                    goalDescription: goal.description,
                    status: goal.status,
                    createdAt: Date()
                )
                modelContext.insert(localGoal)

                withAnimation(.easeInOut(duration: 0.3)) {
                    step = .intake(goalId: goal.id)
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}
