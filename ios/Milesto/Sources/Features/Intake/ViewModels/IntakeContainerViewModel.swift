import Foundation

enum IntakePhase: Equatable {
    case loading
    case answering(IntakeBatch)
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

@MainActor
@Observable
final class IntakeContainerViewModel {
    @ObservationIgnored private let intake: any IntakeRepository
    @ObservationIgnored private let totalEstimatedBatches = 5
    @ObservationIgnored private let maxPollingAttempts = 60
    @ObservationIgnored private var pollingTask: Task<Void, Never>?

    private(set) var goalId: String = ""
    private(set) var phase: IntakePhase = .loading
    private(set) var currentBatchNumber = 0
    var answers: [String: IntakeAnswerDTO] = [:]

    init(intake: any IntakeRepository) {
        self.intake = intake
    }

    var totalBatches: Int {
        totalEstimatedBatches
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func cancelPolling() {
        pollingTask?.cancel()
    }

    func loadNextBatch() async {
        phase = .loading
        do {
            let response = try await intake.getNextBatch(goalId: goalId)
            handleBatchResponse(response)
        } catch {
            phase = .error(error.localizedDescription)
        }
    }

    func submitCurrentBatch() async {
        phase = .submitting
        let answerList = Array(answers.values)
        do {
            let response = try await intake.submitBatch(goalId: goalId, answers: answerList)

            if let nextBatch = response.nextBatch,
               let questions = nextBatch.questions,
               !questions.isEmpty
            {
                answers = [:]
                currentBatchNumber = nextBatch.batchNumber ?? (currentBatchNumber + 1)
                phase = .answering(nextBatch)
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

    func retryProfileGeneration() async {
        phase = .generatingProfile
        do {
            let response = try await intake.retryProfile(goalId: goalId)
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

    private func pollForProfileCompletion() {
        pollingTask?.cancel()
        pollingTask = Task { [weak self] in
            guard let self else { return }
            var attempts = 0
            while !Task.isCancelled && attempts < maxPollingAttempts {
                do {
                    try await Task.sleep(for: .seconds(3))
                    let response = try await intake.getNextBatch(goalId: goalId)
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

    private func handleBatchResponse(_ response: IntakeBatch) {
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
