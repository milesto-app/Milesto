import SwiftData
import SwiftUI

enum IntakePhase: Equatable {
    case loading
    case answering(IntakeBatchResponse)
    case submitting
    case generatingProfile
    case completed
    case error(String)
    case profileFailed

    static func == (lhs: IntakePhase, rhs: IntakePhase) -> Bool {
        switch (lhs, rhs) {
        case (.loading, .loading),
             (.submitting, .submitting),
             (.generatingProfile, .generatingProfile),
             (.completed, .completed),
             (.profileFailed, .profileFailed):
            return true
        case let (.error(a), .error(b)):
            return a == b
        case let (.answering(a), .answering(b)):
            return a.batchId == b.batchId
        default:
            return false
        }
    }
}

struct IntakeContainerView: View {
    let goalId: String
    let onComplete: () -> Void

    @Query private var localProfiles: [LocalProfile]
    @State private var phase: IntakePhase = .loading
    @State private var currentBatchNumber = 0
    @State private var answers: [String: IntakeAnswerDTO] = [:]
    @State private var pollingTask: Task<Void, Never>?

    private let totalEstimatedBatches = 5
    private let maxPollingAttempts = 60

    var body: some View {
        Group {
            switch phase {
            case .loading:
                IntakeLoadingView()

            case let .answering(batch):
                IntakeBatchView(
                    batch: batch,
                    batchNumber: currentBatchNumber,
                    totalBatches: totalEstimatedBatches,
                    answers: $answers,
                    coachId: localProfiles.first?.coachId ?? 1,
                    onSubmit: { submitCurrentBatch() }
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
                IntakeErrorView(message: message, onRetry: { loadNextBatch() })

            case .profileFailed:
                IntakeErrorView(
                    message: String(localized: "intake.error.profileFailed", table: "Intake"),
                    onRetry: { retryProfileGeneration() }
                )
            }
        }
        .animation(.easeInOut(duration: 0.3), value: phase)
        .task {
            loadNextBatch()
        }
        .onDisappear {
            pollingTask?.cancel()
        }
    }

    private func loadNextBatch() {
        Task { @MainActor in
            phase = .loading
            do {
                let response = try await IntakeAPIService.shared.getNextBatch(goalId: goalId)
                handleBatchResponse(response)
            } catch {
                phase = .error(error.localizedDescription)
            }
        }
    }

    private func submitCurrentBatch() {
        Task { @MainActor in
            phase = .submitting
            let answerList = Array(answers.values)
            do {
                let response = try await IntakeAPIService.shared.submitBatch(
                    goalId: goalId,
                    answers: answerList
                )

                if let nextBatch = response.nextBatch,
                   let questions = nextBatch.questions,
                   !questions.isEmpty
                {
                    answers = [:]
                    currentBatchNumber = nextBatch.batchNumber ?? (currentBatchNumber + 1)
                    withAnimation {
                        phase = .answering(nextBatch)
                    }
                    return
                }

                if response.profileStatus == ProfileStatus.intakeCompleted.rawValue {
                    phase = .completed
                    return
                }

                if response.profileStatus == ProfileStatus.generationFailed.rawValue {
                    phase = .profileFailed
                    return
                }

                if response.profileStatus == ProfileStatus.profileGenerating.rawValue {
                    phase = .generatingProfile
                    pollForProfileCompletion()
                    return
                }

                phase = .completed

            } catch {
                phase = .error(error.localizedDescription)
            }
        }
    }

    private func pollForProfileCompletion() {
        pollingTask?.cancel()
        pollingTask = Task { @MainActor in
            var attempts = 0
            while !Task.isCancelled && attempts < maxPollingAttempts {
                do {
                    try await Task.sleep(for: .seconds(3))
                    let response = try await IntakeAPIService.shared.getNextBatch(goalId: goalId)
                    if response.profileStatus == ProfileStatus.intakeCompleted.rawValue {
                        phase = .completed
                        return
                    } else if response.profileStatus == ProfileStatus.generationFailed.rawValue {
                        phase = .profileFailed
                        return
                    }
                    attempts += 1
                } catch is CancellationError {
                    return
                } catch {
                    phase = .error(error.localizedDescription)
                    return
                }
            }
            if !Task.isCancelled {
                phase = .error(String(localized: "intake.error.network", table: "Intake"))
            }
        }
    }

    private func retryProfileGeneration() {
        Task { @MainActor in
            phase = .generatingProfile
            do {
                let response = try await IntakeAPIService.shared.retryProfile(goalId: goalId)
                if response.profileStatus == ProfileStatus.intakeCompleted.rawValue {
                    phase = .completed
                } else if response.profileStatus == ProfileStatus.generationFailed.rawValue {
                    phase = .profileFailed
                } else {
                    pollForProfileCompletion()
                }
            } catch {
                phase = .error(error.localizedDescription)
            }
        }
    }

    private func handleBatchResponse(_ response: IntakeBatchResponse) {
        if let questions = response.questions, !questions.isEmpty {
            answers = [:]
            currentBatchNumber = response.batchNumber ?? 1
            phase = .answering(response)
            return
        }

        if response.profileStatus == ProfileStatus.intakeCompleted.rawValue {
            phase = .completed
            return
        }

        if response.profileStatus == ProfileStatus.generationFailed.rawValue {
            phase = .profileFailed
            return
        }

        if response.profileStatus == ProfileStatus.profileGenerating.rawValue {
            phase = .generatingProfile
            pollForProfileCompletion()
            return
        }

        phase = .completed
    }
}
