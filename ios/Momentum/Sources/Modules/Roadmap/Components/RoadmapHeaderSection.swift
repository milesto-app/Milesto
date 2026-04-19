import SwiftUI

struct RoadmapHeaderSection: View {
    let goalTitle: String
    let goalId: String
    let switchableGoals: [LocalGoal]
    let completionProgress: Double
    let appeared: Bool
    let onGoalChanged: ((String) -> Void)?

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 8) {
                AppText("roadmap.journey.subtitle", table: "Roadmap", style: .caption)
                    .color(Color("TextSecondary"))

                if switchableGoals.count > 1 {
                    Menu {
                        ForEach(switchableGoals, id: \.id) { goal in
                            Button(goal.title) {
                                if goal.id != goalId {
                                    onGoalChanged?(goal.id)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            AppText(verbatim: goalTitle, style: .largeTitle)
                            TablerIcons(.chevronDown, size: 20, color: Color("TextSecondary"))
                        }
                    }
                } else {
                    AppText(verbatim: goalTitle, style: .largeTitle)
                }
            }

            Spacer()

            ZStack {
                Circle()
                    .stroke(Color("TextSecondary").opacity(0.15), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: completionProgress)
                    .stroke(Color("TintPrimary"), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                AppText(
                    verbatim: "\(Int(completionProgress * 100))%",
                    style: .caption
                )
                .weight(.semibold)
                .color(Color("TintPrimary"))
            }
            .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 20)
        .opacity(appeared ? 1 : 0)
        .animation(.easeOut(duration: 0.5), value: appeared)
    }
}
