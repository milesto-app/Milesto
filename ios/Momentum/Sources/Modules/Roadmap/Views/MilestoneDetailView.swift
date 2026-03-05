import SwiftUI

struct MilestoneDetailView: View {
    let title: String
    let description: String
    let expectedOutcome: String
    let targetMonth: Int
    let status: MilestoneStatus

    var body: some View {
        ZStack {
            AnimatedBackground()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    HStack {
                        MilestoneStatusBadge(status: status)
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
                TablerIcon(.notebook, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.milestone.description", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: description, style: .body)
                .color(AppTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }

    private var expectedOutcomeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcon(.flag, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.milestone.expectedOutcome", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: expectedOutcome, style: .body)
                .color(AppTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }

    private var targetCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcon(.calendar, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.milestone.target", table: "Roadmap", style: .headline)
            }

            AppText(
                verbatim: String(
                    format: String(localized: "roadmap.milestone.targetMonth", table: "Roadmap"),
                    targetMonth
                ),
                style: .body
            )
            .color(AppTheme.Colors.accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }
}

#Preview {
    MilestoneDetailView(
        title: "Courir un semi-marathon",
        description: "Completez 21,1 km en course a pied sans vous arreter. Cela demande un entrainement regulier et progressif.",
        expectedOutcome: "Etre capable de courir 21,1 km en moins de 2h30",
        targetMonth: 3,
        status: .current
    )
}
