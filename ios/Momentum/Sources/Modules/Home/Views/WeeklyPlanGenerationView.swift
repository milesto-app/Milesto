import SwiftUI

struct WeeklyPlanGenerationView: View {
    let goalId: String
    let onComplete: () -> Void

    @State private var isGenerating = false
    @State private var hasFailed = false
    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            Color("BgPrimary").ignoresSafeArea()

            if hasFailed {
                errorContent
            } else {
                loadingContent
            }
        }
        .task {
            await generate()
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

            AppText("home.weeklyGeneration.title", table: "Home", style: .title)
                .alignment(.center)

            AppText("home.weeklyGeneration.subtitle", table: "Home", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

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

            AppText("home.weeklyGeneration.error.title", table: "Home", style: .title)
                .alignment(.center)

            AppText("home.weeklyGeneration.error.subtitle", table: "Home", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

            Spacer()

            AppButton("home.weeklyGeneration.retry", table: "Home") {
                Task {
                    await generate()
                }
            }
            .fullWidth()
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
    }

    private func generate() async {
        hasFailed = false
        isGenerating = true

        do {
            _ = try await RoadmapAPIService.shared.generateWeeklyPlan(goalId: goalId)
            await waitForTasks()
            isGenerating = false
            onComplete()
        } catch {
            hasFailed = true
            isGenerating = false
        }
    }

    private func waitForTasks() async {
        for _ in 0 ..< 30 {
            try? await Task.sleep(for: .seconds(2))
            if let tasks = try? await RoadmapAPIService.shared.getWeeklyTasks(goalId: goalId),
               !tasks.isEmpty
            {
                return
            }
        }
    }
}
