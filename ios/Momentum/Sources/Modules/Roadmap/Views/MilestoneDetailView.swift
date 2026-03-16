import SwiftUI

struct MilestoneDetailView: View {
    let title: String
    let description: String
    let expectedOutcome: String
    let targetWeek: Int
    let isMonthlyCheckpoint: Bool
    let status: MilestoneStatus

    var body: some View {
        ZStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    HStack(spacing: 8) {
                        MilestoneStatusBadge(status: status)

                        if isMonthlyCheckpoint {
                            AppText("roadmap.milestone.monthlyCheckpoint", table: "Roadmap", style: .caption)
                                .weight(.semibold)
                                .color(Color("TintPrimary"))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule()
                                        .fill(Color("TintPrimary").opacity(0.15))
                                )
                        }

                        Spacer()
                    }

                    AppText(verbatim: title, style: .largeTitle)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    descriptionCard

                    expectedOutcomeCard

                    targetCard
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.notebook, size: 20, color: Color("TintPrimary"))
                AppText("roadmap.milestone.description", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: description, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }

    private var expectedOutcomeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.flag, size: 20, color: Color("TintPrimary"))
                AppText("roadmap.milestone.expectedOutcome", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: expectedOutcome, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }

    private var targetCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.calendar, size: 20, color: Color("TintPrimary"))
                AppText("roadmap.milestone.target", table: "Roadmap", style: .headline)
            }

            AppText(
                verbatim: String(
                    format: String(localized: "roadmap.milestone.week", table: "Roadmap"),
                    targetWeek
                ),
                style: .body
            )
            .color(Color("TintPrimary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    MilestoneDetailView(
        title: "Courir un semi-marathon",
        description: "Completez 21,1 km en course a pied sans vous arreter. Cela demande un entrainement regulier et progressif.",
        expectedOutcome: "Etre capable de courir 21,1 km en moins de 2h30",
        targetWeek: 12,
        isMonthlyCheckpoint: true,
        status: .current
    )
}
