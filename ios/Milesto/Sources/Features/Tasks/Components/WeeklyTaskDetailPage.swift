import SwiftUI

struct WeeklyTaskDetailPage: View {
    let task: WeeklyTaskDTO
    let weekNumber: Int?
    let appeared: Bool
    let onToggle: ((WeeklyTaskDTO) -> Void)?

    private var accent: Color {
        Color("Brand")
    }

    private var durationLabel: String? {
        formatDuration(task.estimatedMinutes)
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
            RoundedRectangle(cornerRadius: 28, style: .circular)
                .fill(
                    LinearGradient(
                        colors: [accent.opacity(0.32), accent.opacity(0.06)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            RoundedRectangle(cornerRadius: 28, style: .circular)
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
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .circular))

            VStack(alignment: .leading, spacing: 24) {
                eyebrowRow

                AppText(verbatim: task.title, style: .largeTitle)
                    .weight(.semibold)
                    .color(Color("TextPrimary"))
                    .containerRelativeFrame(.horizontal, alignment: .leading) { width, _ in
                        width * 0.7
                    }

                if let durationLabel {
                    HStack {
                        AppPill(verbatim: durationLabel, tint: accent)
                        Spacer(minLength: 0)
                    }
                }
            }
            .padding(24)
        }
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
        AppButton(
            task.isCompleted ? "roadmap.task.markIncomplete" : "roadmap.task.markComplete",
            table: "Roadmap",
            style: task.isCompleted ? .neutral : .primary
        ) {
            withAnimation(.spring(response: 0.42, dampingFraction: 0.78, blendDuration: 0.08)) {
                performToggle()
            }
        }
        .icon(task.isCompleted ? .arrowBackUp : .check)
        .fullWidth()
    }

    private func performToggle() {
        onToggle?(task)
    }
}
