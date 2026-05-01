import SwiftUI

struct HomeJourneyCard: View {
    let goalId: String
    let refreshToken: Int

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: HomeJourneyViewModel?

    var body: some View {
        journeyContent
            .padding(24)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .padding(.horizontal, 20)
            .padding(.top, 32)
            .task {
                if model == nil {
                    let vm = HomeJourneyViewModel(repository: dependencies.roadmap)
                    vm.configure(goalId: goalId)
                    model = vm
                }
            }
            .task(id: "\(goalId)-\(refreshToken)") {
                await model?.refresh()
            }
            .onReceive(NotificationCenter.default.publisher(for: .weeklyTaskCompletionDidChange)) { _ in
                model?.reactToTaskChange()
            }
    }

    private var journeyContent: some View {
        HStack(alignment: .center) {
            titleContent

            Spacer(minLength: 18)

            progressRing
        }
    }

    private var titleContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            AppText("home.journey.subtitle", table: "Home", style: .caption)
                .color(Color("TextSecondary"))

            VStack(alignment: .leading, spacing: 6) {
                AppText(verbatim: model?.goalTitle ?? "", style: .title)
                    .fixedSize(horizontal: false, vertical: true)

                if let goalDeadlineText = model?.goalDeadlineText {
                    AppText(verbatim: goalDeadlineText, style: .subheadline)
                        .color(Color("TextSecondary"))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private var progressRing: some View {
        let progress = model?.completionProgress ?? 0

        return ZStack {
            Circle()
                .stroke(Color("TextSecondary").opacity(0.15), lineWidth: 6)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color("Brand"), style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.3), value: progress)
            AppText(
                verbatim: "\(Int(progress * 100))%",
                style: .subheadline
            )
            .weight(.semibold)
            .color(Color("Brand"))
            .contentTransition(.numericText())
            .animation(.easeInOut(duration: 0.3), value: progress)
        }
        .frame(width: 72, height: 72)
    }
}

#Preview {
    ZStack {
        Color("BackgroundBase").ignoresSafeArea()

        HomeJourneyCard(goalId: "goal-1", refreshToken: 0)
    }
}
