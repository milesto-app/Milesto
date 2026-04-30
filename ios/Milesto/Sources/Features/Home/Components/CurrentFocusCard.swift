import SwiftUI

struct CurrentFocusCard: View {
    let goalId: String
    let refreshToken: Int

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: CurrentFocusViewModel?

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: Date()).capitalized
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                AppText(verbatim: formattedDate, style: .caption)
                    .color(Color("TextSecondary"))

                AppText(verbatim: model?.title ?? "", style: .title)
            }

            VStack(alignment: .leading, spacing: 8) {
                GeometryReader { geometry in
                    let progress = model?.progress ?? 0
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color("TextSecondary").opacity(0.3))
                            .frame(height: 10)
                        Capsule()
                            .fill(Color("Brand"))
                            .frame(
                                width: max(geometry.size.width * progress, progress > 0 ? 10 : 0),
                                height: 10
                            )
                            .animation(.easeInOut(duration: 0.3), value: progress)
                    }
                }
                .frame(height: 10)

                HStack {
                    AppText(
                        verbatim: "\(Int((model?.progress ?? 0) * 100))%",
                        style: .subheadline
                    )
                    .weight(.semibold)
                    .color(Color("Brand"))
                    .contentTransition(.numericText())
                    .animation(.easeInOut(duration: 0.3), value: model?.progress ?? 0)
                    Spacer()
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 32)
        .task {
            if model == nil {
                let vm = CurrentFocusViewModel(repository: dependencies.roadmap)
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
}
