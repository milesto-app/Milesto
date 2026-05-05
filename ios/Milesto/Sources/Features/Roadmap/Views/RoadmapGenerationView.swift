import SwiftUI

struct RoadmapGenerationView: View {
    let goalId: String
    let onComplete: () -> Void

    @Environment(AppEnv.self) private var dependencies
    @State private var model: RoadmapGenerationViewModel?
    @State private var currentTipIndex = 0
    @State private var tipOpacity: Double = 1
    @State private var pulseScale: CGFloat = 1.0
    @State private var tipTask: Task<Void, Never>?

    private let tips = [
        String(localized: "roadmap.generation.tip1", table: "Roadmap"),
        String(localized: "roadmap.generation.tip2", table: "Roadmap"),
        String(localized: "roadmap.generation.tip3", table: "Roadmap"),
    ]

    var body: some View {
        ZStack {
            if let model, model.hasFailed {
                errorContent
            } else {
                loadingContent
            }
        }
        .appBackground()
        .task {
            if model == nil {
                model = RoadmapGenerationViewModel(repository: dependencies.roadmap)
            }
            await runGeneration()
        }
        .onDisappear {
            tipTask?.cancel()
        }
    }

    private var loadingContent: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.sparkles, size: 56, color: Color("Brand"))
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
                .tint(Color("Brand"))
                .padding(.bottom, 40)
        }
        .padding(.horizontal, 24)
    }

    private var errorContent: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.alertCircle, size: 48, color: Color("Error"))

            AppText("roadmap.generation.error.title", table: "Roadmap", style: .title)
                .alignment(.center)

            AppText("roadmap.generation.error.subtitle", table: "Roadmap", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

            Spacer()

            AppButton("roadmap.generation.retry", table: "Roadmap") {
                Task { await runGeneration() }
            }
            .fullWidth()
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
    }

    private func runGeneration() async {
        guard let model else { return }
        startTipRotation(model: model)
        let success = await model.generate(goalId: goalId)
        if success {
            onComplete()
        }
    }

    private func startTipRotation(model: RoadmapGenerationViewModel) {
        tipTask?.cancel()
        tipTask = Task {
            while model.isGenerating {
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
