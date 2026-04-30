import SwiftUI

struct WeeklyPlanGenerationView: View {
    let goalId: String
    let onComplete: () -> Void

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: WeeklyPlanGenerationViewModel?
    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            Color("BackgroundBase").ignoresSafeArea()

            if let model {
                if model.hasFailed {
                    errorContent(model: model)
                } else {
                    loadingContent
                }
            } else {
                loadingContent
            }
        }
        .task {
            if model == nil {
                model = WeeklyPlanGenerationViewModel(repository: dependencies.home)
            }
            await runGeneration()
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

            AppText("home.weeklyGeneration.title", table: "Home", style: .title)
                .alignment(.center)

            AppText("home.weeklyGeneration.subtitle", table: "Home", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

            Spacer()

            ProgressView()
                .controlSize(.large)
                .tint(Color("Brand"))
                .padding(.bottom, 40)
        }
        .padding(.horizontal, 24)
    }

    @ViewBuilder
    private func errorContent(model _: WeeklyPlanGenerationViewModel) -> some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.alertCircle, size: 48, color: Color("Error"))

            AppText("home.weeklyGeneration.error.title", table: "Home", style: .title)
                .alignment(.center)

            AppText("home.weeklyGeneration.error.subtitle", table: "Home", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

            Spacer()

            AppButton("home.weeklyGeneration.retry", table: "Home") {
                Task { await runGeneration() }
            }
            .fullWidth()
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
    }

    private func runGeneration() async {
        guard let model else { return }
        let success = await model.generate(goalId: goalId)
        if success {
            onComplete()
        }
    }
}
