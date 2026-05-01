import SwiftUI

struct WeeklyTaskDetailPage: View {
    let task: WeeklyTask
    let weekNumber: Int?
    let indexInWeek: Int
    let totalInWeek: Int
    let appeared: Bool
    let onToggle: ((WeeklyTask) -> Void)?

    private var accent: Color {
        switch task.difficultyRating {
        case .easy: return Color("Success")
        case .moderate: return Color("Warning")
        case .hard: return Color("Error")
        case nil: return Color("Brand")
        }
    }

    private var difficultyLabel: String {
        switch task.difficultyRating {
        case .easy: return String(localized: "home.tasks.difficulty.easy", table: "Home")
        case .moderate: return String(localized: "home.tasks.difficulty.moderate", table: "Home")
        case .hard: return String(localized: "home.tasks.difficulty.hard", table: "Home")
        case nil: return ""
        }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 32) {
                heroCard
                    .padding(.horizontal, 20)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 12)

                descriptionCard
                    .padding(.horizontal, 24)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 12)

                if onToggle != nil {
                    toggleButton
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 12)
                }
            }
            .padding(.bottom, 40)
        }
        .background(Color("BackgroundBase"))
        .contentMargins(.top, 96)
    }

    private var heroCard: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [accent.opacity(0.32), accent.opacity(0.06)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(accent.opacity(0.35), lineWidth: 1)

            GeometryReader { geo in
                ZStack {
                    Circle()
                        .stroke(accent.opacity(0.22), lineWidth: 1)
                        .frame(width: 260, height: 260)
                        .position(x: geo.size.width - 40, y: 0)
                    Circle()
                        .stroke(accent.opacity(0.14), lineWidth: 1)
                        .frame(width: 420, height: 420)
                        .position(x: geo.size.width - 40, y: 0)
                    Circle()
                        .stroke(accent.opacity(0.08), lineWidth: 1)
                        .frame(width: 600, height: 600)
                        .position(x: geo.size.width - 40, y: 0)

                    AppText(verbatim: String(format: "%02d", indexInWeek + 1), style: .largeTitle)
                        .color(accent.opacity(0.18))
                        .position(x: geo.size.width - 64, y: 68)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))

            VStack(alignment: .leading, spacing: 24) {
                eyebrowRow

                AppText(verbatim: task.title, style: .largeTitle)
                    .weight(.semibold)
                    .color(Color("TextPrimary"))
                    .containerRelativeFrame(.horizontal, alignment: .leading) { width, _ in
                        width * 0.7
                    }

                HStack(alignment: .center, spacing: 12) {
                    if totalInWeek > 1 {
                        HStack(spacing: 6) {
                            ForEach(0 ..< totalInWeek, id: \.self) { i in
                                Capsule()
                                    .fill(i == indexInWeek ? accent : accent.opacity(0.22))
                                    .frame(
                                        width: i == indexInWeek ? 20 : 6,
                                        height: 4
                                    )
                            }
                        }
                    }

                    Spacer(minLength: 0)

                    if task.difficultyRating != nil {
                        difficultyBadge
                    }
                }
            }
            .padding(24)
        }
    }

    private var difficultyBadge: some View {
        AppPill(verbatim: difficultyLabel, tint: accent)
    }

    private var eyebrowRow: some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Rectangle()
                    .fill(accent)
                    .frame(width: 18, height: 1)
                AppText("roadmap.task.eyebrow", table: "Roadmap", style: .caption)
                    .weight(.semibold)
                    .color(accent)
            }

            if let weekNumber {
                AppText(
                    verbatim: "·",
                    style: .caption
                )
                .color(Color("TextSecondary").opacity(0.6))

                AppText(
                    verbatim: String(
                        format: String(localized: "roadmap.task.weekShort", table: "Roadmap"),
                        weekNumber
                    ),
                    style: .caption
                )
                .weight(.semibold)
                .color(Color("TextSecondary"))
            }

            Spacer()
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("roadmap.task.description", table: "Roadmap", style: .headline)

            AppText(verbatim: task.description, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var toggleButton: some View {
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                performToggle()
            }
        } label: {
            HStack(spacing: 10) {
                TablerIcons(
                    task.isCompleted ? .arrowBackUp : .check,
                    size: 20,
                    color: Color("TextOnBrand")
                )

                AppText(
                    task.isCompleted ? "roadmap.task.markIncomplete" : "roadmap.task.markComplete",
                    table: "Roadmap",
                    style: .body
                )
                .weight(.semibold)
                .color(Color("TextOnBrand"))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .padding(.horizontal, 24)
        }
        .glassEffect(
            .regular.interactive().tint(accent),
            in: RoundedRectangle(cornerRadius: 16)
        )
    }

    private func performToggle() {
        onToggle?(task)
    }
}
