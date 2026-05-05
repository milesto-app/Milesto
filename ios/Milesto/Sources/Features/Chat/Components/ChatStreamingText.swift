import SwiftUI

struct ChatStreamingText: View {
    let content: String
    let isStreaming: Bool

    @State private var revealedCount = 0
    @State private var revealTask: Task<Void, Never>?
    @State private var isFinished = false

    private let revealInterval: UInt64 = 15_000_000
    private let fastDrainInterval: UInt64 = 5_000_000
    private let hapticInterval = 20
    private let streamHaptic = UIImpactFeedbackGenerator(style: .soft)
    private let completionHaptic = UINotificationFeedbackGenerator()

    var body: some View {
        if isFinished {
            ChatMarkdownText(content: content)
                .transaction { $0.animation = nil }
        } else {
            ChatMarkdownText(content: String(content.prefix(revealedCount)))
                .frame(maxWidth: .infinity, alignment: .leading)
                .onChange(of: content) {
                    startRevealIfNeeded()
                }
                .onChange(of: isStreaming) {
                    if !isStreaming {
                        startFastDrain()
                    }
                }
                .onAppear {
                    if isStreaming {
                        streamHaptic.prepare()
                        startRevealIfNeeded()
                    } else {
                        revealedCount = content.count
                        isFinished = true
                    }
                }
                .onDisappear {
                    revealTask?.cancel()
                    revealTask = nil
                }
        }
    }

    private func startRevealIfNeeded() {
        guard revealTask == nil else { return }
        revealTask = Task { @MainActor in
            while !Task.isCancelled {
                if revealedCount < content.count {
                    revealedCount += 1
                    if revealedCount % hapticInterval == 0 {
                        streamHaptic.impactOccurred(intensity: 0.4)
                    }
                } else if !isStreaming {
                    completionHaptic.notificationOccurred(.success)
                    isFinished = true
                    break
                }
                try? await Task.sleep(nanoseconds: revealInterval)
            }
        }
    }

    private func startFastDrain() {
        revealTask?.cancel()
        revealTask = nil
        revealTask = Task { @MainActor in
            while !Task.isCancelled, revealedCount < content.count {
                revealedCount += 1
                try? await Task.sleep(nanoseconds: fastDrainInterval)
            }
            if !Task.isCancelled {
                completionHaptic.notificationOccurred(.success)
                isFinished = true
            }
        }
    }
}
