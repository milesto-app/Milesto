import SwiftUI

struct HomeJourneyCard: View {
    let goalId: String

    @Environment(AppEnv.self) private var dependencies
    @State private var model: HomeJourneyViewModel?

    var body: some View {
        journeyContent
            .padding(.horizontal, 24)
            .padding(.top, 32)
            .task(id: goalId) {
                if model == nil {
                    let vm = HomeJourneyViewModel(repository: dependencies.roadmap)
                    vm.configure(goalId: goalId)
                    model = vm
                }
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
