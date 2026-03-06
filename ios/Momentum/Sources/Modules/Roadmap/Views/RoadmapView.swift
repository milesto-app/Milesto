import SwiftData
import SwiftUI

struct DisplayMilestone: Identifiable {
    let id: String
    let title: String
    let description: String
    let targetMonth: Int
    let orderIndex: Int
    let expectedOutcome: String
    let status: MilestoneStatus
    let progress: Double
    var isKeyMilestone: Bool
}

struct RoadmapView: View {
    let goalId: String
    var onGoalChanged: ((String) -> Void)?

    @Query private var localGoals: [LocalGoal]
    @State private var milestones: [DisplayMilestone] = []
    @State private var isLoading = true
    @State private var appeared = false
    @State private var selectedMilestone: DisplayMilestone?

    private let nodeSpacing: CGFloat = 110
    private let sidePadding: CGFloat = 16
    private let labelWidth: CGFloat = 180

    private var currentGoal: LocalGoal? {
        localGoals.first { $0.id == goalId }
    }

    private var switchableGoals: [LocalGoal] {
        localGoals.filter { $0.status == "active" || $0.status == ProfileStatus.intakeCompleted.rawValue }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                AnimatedBackground()

                if isLoading && milestones.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 0) {
                            headerSection

                            GeometryReader { geo in
                                let centerX = geo.size.width / 2

                                ZStack(alignment: .topLeading) {
                                    pathLine(centerX: centerX)
                                        .opacity(appeared ? 1 : 0)
                                        .animation(.easeOut(duration: 0.4), value: appeared)

                                    ForEach(Array(milestones.enumerated()), id: \.element.id) { index, milestone in
                                        let pos = nodePosition(index: index, centerX: centerX)
                                        let labelOnRight = pos.x <= centerX

                                        Button {
                                            selectedMilestone = milestone
                                        } label: {
                                            nodeCircle(milestone: milestone, index: index)
                                        }
                                        .buttonStyle(.plain)
                                        .position(x: pos.x, y: pos.y)
                                        .opacity(appeared ? 1 : 0)
                                        .animation(.easeOut(duration: 0.3).delay(Double(index) * 0.05 + 0.1), value: appeared)

                                        let labelGap = nodeSize(milestone) / 2 + 12

                                        Button {
                                            selectedMilestone = milestone
                                        } label: {
                                            milestoneLabel(milestone: milestone, alignTrailing: !labelOnRight)
                                        }
                                        .buttonStyle(.plain)
                                        .position(
                                            x: labelOnRight
                                                ? pos.x + labelGap + labelWidth / 2
                                                : pos.x - labelGap - labelWidth / 2,
                                            y: pos.y
                                        )
                                        .opacity(appeared ? 1 : 0)
                                        .animation(.easeOut(duration: 0.3).delay(Double(index) * 0.05 + 0.15), value: appeared)
                                    }
                                }
                                .frame(height: CGFloat(milestones.count) * nodeSpacing + nodeSpacing / 2)
                            }
                            .frame(height: CGFloat(milestones.count) * nodeSpacing + nodeSpacing / 2)
                        }
                        .padding(.bottom, 40 * 2)
                    }
                    .hapticRefreshable {
                        await loadMilestones()
                    }
                }
            }
            .navigationDestination(item: $selectedMilestone) { milestone in
                MilestoneDetailView(
                    title: milestone.title,
                    description: milestone.description,
                    expectedOutcome: milestone.expectedOutcome,
                    targetMonth: milestone.targetMonth,
                    status: milestone.status
                )
            }
        }
        .task {
            guard milestones.isEmpty else { return }
            await loadMilestones()
        }
        .onAppear {
            appeared = true
        }
        .onChange(of: goalId) {
            milestones = []
            isLoading = true
            appeared = false
            Task {
                await loadMilestones()
                appeared = true
            }
        }
    }

    private func waveAmplitude(for screenWidth: CGFloat) -> CGFloat {
        (screenWidth / 2) - sidePadding - 26
    }

    private func nodePosition(index: Int, centerX: CGFloat) -> CGPoint {
        let y = CGFloat(index) * nodeSpacing + nodeSpacing / 2
        let side: CGFloat = index % 2 == 0 ? -1 : 1
        let x = centerX + side * waveAmplitude(for: centerX * 2)
        return CGPoint(x: x, y: y)
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            AppText("roadmap.journey.subtitle", table: "Roadmap", style: .caption)
                .color(Colors.textSecondary)

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
                        AppText(verbatim: currentGoal?.title ?? "", style: .largeTitle)
                        TablerIcons(.chevronDown, size: 20, color: Colors.textSecondary)
                    }
                }
            } else {
                AppText(verbatim: currentGoal?.title ?? "", style: .largeTitle)
            }

            HStack(spacing: 8) {
                AppText(
                    verbatim: "\(milestones.filter { $0.status == .completed }.count)/\(milestones.count)",
                    style: .subheadline
                )
                .weight(.semibold)
                .color(Colors.accent)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .opacity(appeared ? 1 : 0)
        .animation(.easeOut(duration: 0.5), value: appeared)
    }

    private func pathLine(centerX: CGFloat) -> some View {
        Canvas { context, _ in
            guard milestones.count > 1 else { return }

            let cornerRadius: CGFloat = 16
            let gap: CGFloat = 10

            for i in 0 ..< milestones.count - 1 {
                let start = nodePosition(index: i, centerX: centerX)
                let end = nodePosition(index: i + 1, centerX: centerX)
                let startInset = nodeSize(milestones[i]) / 2 + gap
                let endInset = nodeSize(milestones[i + 1]) / 2 + gap
                let midY = (start.y + end.y) / 2

                var segment = Path()
                segment.move(to: CGPoint(x: start.x, y: start.y + startInset))
                segment.addLine(to: CGPoint(x: start.x, y: midY - cornerRadius))
                segment.addQuadCurve(
                    to: CGPoint(x: start.x + (end.x > start.x ? cornerRadius : -cornerRadius), y: midY),
                    control: CGPoint(x: start.x, y: midY)
                )
                segment.addLine(to: CGPoint(x: end.x - (end.x > start.x ? cornerRadius : -cornerRadius), y: midY))
                segment.addQuadCurve(
                    to: CGPoint(x: end.x, y: midY + cornerRadius),
                    control: CGPoint(x: end.x, y: midY)
                )
                segment.addLine(to: CGPoint(x: end.x, y: end.y - endInset))

                let nextIsUpcoming = milestones[i + 1].status == .upcoming
                let bothCompleted = milestones[i].status == .completed && milestones[i + 1].status == .completed

                if nextIsUpcoming {
                    context.stroke(
                        segment,
                        with: .color(Colors.textSecondary.opacity(0.15)),
                        style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round, dash: [8, 6])
                    )
                } else {
                    context.stroke(
                        segment,
                        with: .color(
                            bothCompleted
                                ? Colors.accent.opacity(0.4)
                                : Colors.accent.opacity(0.25)
                        ),
                        style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round)
                    )
                }
            }
        }
    }

    private func nodeSize(_ milestone: DisplayMilestone) -> CGFloat {
        if milestone.isKeyMilestone || milestone.status == .current { return 44 }
        return 34
    }

    private func nodeCircle(milestone: DisplayMilestone, index: Int) -> some View {
        let size = nodeSize(milestone)

        return ZStack {
            if milestone.isKeyMilestone && milestone.status != .current {
                Circle()
                    .fill(nodeColor(milestone.status).opacity(0.12))
                    .frame(width: size + 12, height: size + 12)
            }

            Circle()
                .fill(nodeColor(milestone.status))
                .frame(width: size, height: size)

            if milestone.isKeyMilestone && milestone.status != .upcoming {
                Circle()
                    .strokeBorder(Colors.textOnAccent.opacity(0.2), lineWidth: 2)
                    .frame(width: size - 6, height: size - 6)
            }

            if milestone.status == .upcoming && !milestone.isKeyMilestone {
                Circle()
                    .strokeBorder(Colors.textSecondary.opacity(0.2), lineWidth: 2)
                    .frame(width: size, height: size)
            }

            if milestone.status == .upcoming && milestone.isKeyMilestone {
                Circle()
                    .strokeBorder(Colors.textSecondary.opacity(0.25), lineWidth: 2.5)
                    .frame(width: size, height: size)
            }

            nodeIcon(milestone: milestone, index: index, size: size)
        }
    }

    private func nodeIcon(milestone: DisplayMilestone, index: Int, size _: CGFloat) -> some View {
        let isGoal = index == milestones.count - 1
        let icon: TablerIconOutline = isGoal ? .trophy : .star

        return Group {
            if milestone.isKeyMilestone || isGoal {
                switch milestone.status {
                case .completed:
                    TablerIcons(icon, size: 22, color: Colors.textOnAccent)
                case .current:
                    TablerIcons(icon, size: 24, color: Colors.textOnAccent)
                case .upcoming:
                    TablerIcons(icon, size: 22, color: Colors.textSecondary)
                }
            } else {
                switch milestone.status {
                case .completed:
                    TablerIcons(.check, size: 20, color: Colors.textOnAccent)
                case .current:
                    TablerIcons(.mapPin, size: 20, color: Colors.textOnAccent)
                case .upcoming:
                    EmptyView()
                }
            }
        }
    }

    private func milestoneLabel(milestone: DisplayMilestone, alignTrailing: Bool) -> some View {
        VStack(alignment: alignTrailing ? .trailing : .leading, spacing: 2) {
            AppText(verbatim: milestone.title, style: milestone.isKeyMilestone ? .headline : .subheadline)
                .weight(milestone.isKeyMilestone ? .bold : .semibold)
                .color(milestone.status == .upcoming ? Colors.textSecondary : Colors.textPrimary)

            HStack(spacing: 4) {
                AppText(
                    verbatim: String(
                        format: String(localized: "roadmap.milestone.targetMonth", table: "Roadmap"),
                        milestone.targetMonth
                    ),
                    style: .caption
                )
                .color(Colors.textSecondary)

                if milestone.status == .current {
                    AppText(verbatim: "·", style: .caption)
                        .color(Colors.textSecondary)
                    AppText(verbatim: "\(Int(milestone.progress * 100))%", style: .caption)
                        .weight(.semibold)
                        .color(Colors.accent)
                }
            }
        }
        .frame(width: labelWidth, alignment: alignTrailing ? .trailing : .leading)
    }

    private func nodeColor(_ status: MilestoneStatus) -> Color {
        switch status {
        case .completed: return Colors.accent
        case .current: return Colors.accent
        case .upcoming: return Colors.nodeUpcoming
        }
    }

    private func loadMilestones() async {
        do {
            let roadmap = try await RoadmapAPIService.shared.getRoadmap(goalId: goalId)
            guard let dtos = roadmap.milestones else { return }

            let sorted = dtos.sorted { $0.orderIndex < $1.orderIndex }

            let currentMilestoneId = roadmap.currentMilestoneId
            var foundCurrent = false

            milestones = sorted.enumerated().map { index, dto in
                let status: MilestoneStatus
                if let currentId = currentMilestoneId {
                    if dto.id == currentId {
                        status = .current
                        foundCurrent = true
                    } else if !foundCurrent {
                        status = .completed
                    } else {
                        status = .upcoming
                    }
                } else {
                    status = index == 0 ? .current : .upcoming
                }

                return DisplayMilestone(
                    id: dto.id,
                    title: dto.title,
                    description: dto.description,
                    targetMonth: dto.targetMonth,
                    orderIndex: dto.orderIndex,
                    expectedOutcome: dto.expectedOutcome,
                    status: status,
                    progress: status == .current ? 0.5 : (status == .completed ? 1.0 : 0.0),
                    isKeyMilestone: index == sorted.count - 1
                )
            }
        } catch {}
        isLoading = false
    }
}

extension DisplayMilestone: Hashable {
    static func == (lhs: DisplayMilestone, rhs: DisplayMilestone) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

#Preview {
    RoadmapView(goalId: "preview-goal")
        .modelContainer(for: [LocalGoal.self], inMemory: true)
}
