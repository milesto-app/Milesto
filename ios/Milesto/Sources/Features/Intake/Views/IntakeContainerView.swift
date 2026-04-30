import SwiftUI

struct IntakeContainerView: View {
    let goalId: String
    let onComplete: () -> Void

    @State private var model = IntakeContainerViewModel()

    var body: some View {
        Group {
            switch model.phase {
            case .loading:
                IntakeLoadingView()

            case let .answering(batch):
                IntakeBatchView(
                    batch: batch,
                    batchNumber: model.currentBatchNumber,
                    totalBatches: model.totalBatches,
                    answers: $model.answers,
                    onSubmit: {
                        Task { await model.submitCurrentBatch() }
                    }
                )
                .id(batch.batchId)
                .transition(.push(from: .trailing))

            case .submitting:
                IntakeLoadingView()

            case .generatingProfile:
                IntakeLoadingView(isGeneratingProfile: true)

            case .completed:
                IntakeCompletionView(onContinue: onComplete)

            case let .error(message):
                IntakeErrorView(message: message, onRetry: {
                    Task { await model.loadNextBatch() }
                })

            case .profileFailed:
                IntakeErrorView(
                    message: String(localized: "intake.error.profileFailed", table: "Intake"),
                    onRetry: {
                        Task { await model.retryProfileGeneration() }
                    }
                )
            }
        }
        .animation(.easeInOut(duration: 0.3), value: model.phase)
        .onAppear {
            model.configure(goalId: goalId)
        }
        .task {
            await model.loadNextBatch()
        }
        .onDisappear {
            model.cancelPolling()
        }
    }
}
