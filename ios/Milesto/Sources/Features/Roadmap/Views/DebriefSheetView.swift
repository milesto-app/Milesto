import SwiftUI

struct DebriefSheetView: View {
    let goalId: String
    let weeklyPlanId: String
    let onDebriefComplete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(AppEnv.self) private var dependencies
    @State private var model: DebriefSheetViewModel?

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = DebriefSheetViewModel(
                    repository: dependencies.roadmap,
                    goalId: goalId,
                    weeklyPlanId: weeklyPlanId
                )
            }
        }
    }

    @ViewBuilder
    private func content(model: DebriefSheetViewModel) -> some View {
        let reflectionBinding = Binding<String>(
            get: { model.reflectionNote },
            set: { model.updateReflectionNote($0) }
        )
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    AppText("home.debrief.title", table: "Home", style: .title)
                        .padding(.bottom, 8)

                    reflectionSection(text: reflectionBinding)

                    if let error = model.errorMessage {
                        AppText(verbatim: error, style: .caption)
                            .color(Color("Error"))
                    }

                    AppButton("home.debrief.submit", table: "Home", style: .primary) {
                        Task {
                            if await model.submit() {
                                dismiss()
                                onDebriefComplete()
                            }
                        }
                    }
                    .fullWidth()
                    .disabled(!model.canSubmit)
                }
                .padding(24)
            }
            .background(Color("BackgroundBase"))
        }
        .appBackground()
        .appPresentationBackground()
        .presentationDetents([.large])
    }

    private func reflectionSection(text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("home.debrief.reflection.title", table: "Home", style: .headline)

            AppTextField(
                text: text,
                placeholder: "home.debrief.reflection.placeholder",
                table: "Home",
                multiline: true
            )

            HStack {
                Spacer()
                TranscriptionToggleButton(transcribedText: text)
            }
        }
    }
}
