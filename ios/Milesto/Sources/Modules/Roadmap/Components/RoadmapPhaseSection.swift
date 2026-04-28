import SwiftUI

struct RoadmapPhaseSection: View {
    let section: RoadmapMonthSection
    let isExpanded: Bool
    let appeared: Bool
    let animationDelay: Double
    let onToggleExpanded: () -> Void
    let onSelect: (DisplayMilestone) -> Void

    private var visibleMilestones: [DisplayMilestone] {
        section.visibleMilestones(isExpanded: isExpanded)
    }

    private var hasCollapsedHistory: Bool {
        visibleMilestones.count < section.milestones.count
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            phaseHeader

            if !visibleMilestones.isEmpty {
                GlassEffectContainer(spacing: 14) {
                    VStack(spacing: 12) {
                        ForEach(visibleMilestones, id: \.id) { milestone in
                            Button {
                                onSelect(milestone)
                            } label: {
                                RoadmapMilestoneRow(
                                    milestone: milestone,
                                    position: sectionPosition(for: milestone),
                                    totalInSection: section.milestones.count
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 14)
        .animation(.easeOut(duration: 0.38).delay(animationDelay), value: appeared)
    }

    private var phaseHeader: some View {
        Button {
            if hasCollapsedHistory || isExpanded {
                withAnimation(.easeInOut(duration: 0.22)) {
                    onToggleExpanded()
                }
            }
        } label: {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 7) {
                        AppText(verbatim: section.title, style: .headline)
                            .weight(section.isCurrent ? .semibold : .medium)

                        if section.isCurrent {
                            AppText("roadmap.phase.currentBadge", table: "Roadmap", style: .caption)
                                .weight(.semibold)
                                .color(Color("TextOnBrand"))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(Color("Brand")))
                        }
                    }

                    AppText(verbatim: section.subtitle, style: .caption)
                        .color(Color("TextSecondary"))
                }

                Spacer()

                AppText(
                    verbatim: "\(section.completedCount)/\(section.milestones.count)",
                    style: .caption
                )
                .weight(.semibold)
                .color(section.isCurrent ? Color("Brand") : Color("TextSecondary"))

                if hasCollapsedHistory || isExpanded {
                    TablerIcons(isExpanded ? .chevronUp : .chevronDown, size: 18, color: Color("TextSecondary"))
                        .frame(width: 22, height: 22)
                }
            }
            .padding(.horizontal, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func sectionPosition(for milestone: DisplayMilestone) -> Int {
        (section.milestones.firstIndex { $0.id == milestone.id } ?? 0) + 1
    }
}

#Preview {
    RoadmapPhaseSection(
        section: RoadmapMonthSection(
            targetMonth: 1,
            milestones: [
                DisplayMilestone(
                    id: "1",
                    title: "Build the weekly baseline",
                    description: "Create a repeatable rhythm.",
                    targetMonth: 1,
                    targetWeek: 1,
                    isMonthlyCheckpoint: false,
                    orderIndex: 0,
                    expectedOutcome: "A stable routine that can survive busy days.",
                    status: .completed,
                    progress: 1
                ),
                DisplayMilestone(
                    id: "2",
                    title: "Practice the weekly review loop",
                    description: "Review the first phase.",
                    targetMonth: 1,
                    targetWeek: 4,
                    isMonthlyCheckpoint: true,
                    orderIndex: 1,
                    expectedOutcome: "A clear read on what is working and what needs adjusting.",
                    status: .current,
                    progress: 0.45
                ),
            ]
        ),
        isExpanded: false,
        appeared: true,
        animationDelay: 0,
        onToggleExpanded: {},
        onSelect: { _ in }
    )
    .padding()
}
