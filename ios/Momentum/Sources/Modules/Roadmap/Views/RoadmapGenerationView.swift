import OSLog
import SwiftUI

private let logger = Logger(subsystem: "app.momentum", category: "RoadmapGeneration")

struct RoadmapGenerationView: View {
    let goalId: String
    let onComplete: () -> Void

    @State private var isGenerating = false
    @State private var hasFailed = false
    @State private var currentTipIndex = 0
    @State private var tipOpacity: Double = 1
    @State private var pulseScale: CGFloat = 1.0

    private let tips = [
        String(localized: "roadmap.generation.tip1", table: "Roadmap"),
        String(localized: "roadmap.generation.tip2", table: "Roadmap"),
        String(localized: "roadmap.generation.tip3", table: "Roadmap"),
    ]

    var body: some View {
        ZStack {
            if hasFailed {
                errorContent
            } else {
                loadingContent
            }
        }
        .task {
            await startGeneration()
        }
    }

    private var loadingContent: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.sparkles, size: 56, color: Color("TintPrimary"))
                .scaleEffect(pulseScale)
                .onAppear {
                    withAnimation(
                        .easeInOut(duration: 1.2)
                            .repeatForever(autoreverses: true)
                    ) {
                        pulseScale = 1.15
                    }
                }

            AppText("roadmap.generation.title", table: "Roadmap", style: .title)
                .alignment(.center)

            AppText("roadmap.generation.subtitle", table: "Roadmap", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

            AppText(verbatim: tips[currentTipIndex], style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)
                .opacity(tipOpacity)
                .padding(.top, 16)

            Spacer()

            ProgressView()
                .controlSize(.large)
                .tint(Color("TintPrimary"))
                .padding(.bottom, 40)
        }
        .padding(.horizontal, 24)
    }

    private var errorContent: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.alertCircle, size: 48, color: Color("StatusError"))

            AppText("roadmap.generation.error.title", table: "Roadmap", style: .title)
                .alignment(.center)

            AppText("roadmap.generation.error.subtitle", table: "Roadmap", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

            Spacer()

            AppButton("roadmap.generation.retry", table: "Roadmap") {
                Task {
                    await startGeneration()
                }
            }
            .fullWidth()
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
    }

    private func startGeneration() async {
        hasFailed = false
        isGenerating = true

        do {
            _ = try await RoadmapAPIService.shared.generateRoadmap(goalId: goalId)
        } catch {
            if let backendError = error as? BackendError,
               case .httpError(statusCode: 409, _) = backendError
            {
            } else {
                logger.error("Generate roadmap call failed: \(error)")
                hasFailed = true
                isGenerating = false
                return
            }
        }

        startTipRotation()

        for _ in 0 ..< 60 {
            try? await Task.sleep(for: .seconds(3))

            do {
                let roadmap = try await RoadmapAPIService.shared.getRoadmap(goalId: goalId)
                if roadmap.status == .complete {
                    isGenerating = false
                    onComplete()
                    return
                } else if roadmap.status == .failed {
                    hasFailed = true
                    isGenerating = false
                    return
                }
            } catch {
                logger.error("Roadmap poll failed: \(error)")
            }
        }

        hasFailed = true
        isGenerating = false
    }

    private func startTipRotation() {
        Task {
            while isGenerating {
                try? await Task.sleep(for: .seconds(4))
                withAnimation(.easeInOut(duration: 0.3)) {
                    tipOpacity = 0
                }
                try? await Task.sleep(for: .milliseconds(300))
                currentTipIndex = (currentTipIndex + 1) % tips.count
                withAnimation(.easeInOut(duration: 0.3)) {
                    tipOpacity = 1
                }
            }
        }
    }
}

#Preview {
    RoadmapGenerationView(goalId: "preview-goal-id", onComplete: {})
}
