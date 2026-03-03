import SwiftUI

struct ChatHistorySidebar: View {
    @Binding var isOpen: Bool
    let conversations: [ConversationSummary]
    let activeConversationId: String?
    let onSelectConversation: (String) -> Void
    let onNewConversation: () -> Void

    @State private var dragOffset: CGFloat = 0

    private enum TimePeriod: CaseIterable {
        case today, yesterday, week, month, older

        var label: String {
            switch self {
            case .today: return String(localized: "chat.history.today", table: "Chat")
            case .yesterday: return String(localized: "chat.history.yesterday", table: "Chat")
            case .week: return String(localized: "chat.history.week", table: "Chat")
            case .month: return String(localized: "chat.history.month", table: "Chat")
            case .older: return String(localized: "chat.history.older", table: "Chat")
            }
        }
    }

    var body: some View {
        ZStack(alignment: .leading) {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture { dismiss() }

            panel
                .offset(x: dragOffset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            if value.translation.width < 0 {
                                dragOffset = value.translation.width
                            }
                        }
                        .onEnded { value in
                            if value.translation.width < -80 {
                                dismiss()
                            } else {
                                withAnimation(.spring(duration: 0.3)) {
                                    dragOffset = 0
                                }
                            }
                        }
                )
        }
        .transition(.opacity)
    }

    private var panel: some View {
        GeometryReader { geometry in
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                header
                if conversations.isEmpty {
                    emptyState
                } else {
                    conversationList
                }
            }
            .safeAreaPadding(.top)
            .frame(width: geometry.size.width * 0.8 + 8, height: geometry.size.height + 8)
            .glassEffect(.regular, in: .rect)
            .ignoresSafeArea()
            .offset(x: -4, y: -4)
            .transition(.move(edge: .leading))
        }
    }

    private var header: some View {
        HStack {
            AppText("chat.history.title", table: "Chat", style: .headline)
            Spacer()
            Button(action: {
                dismiss()
                onNewConversation()
            }) {
                TablerIcon(.edit, size: 20, color: AppTheme.Colors.textPrimary)
                    .frame(width: 36, height: 36)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
        }
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.top, 48)
        .padding(.bottom, AppTheme.Spacing.xxs)
    }

    private var emptyState: some View {
        VStack(spacing: AppTheme.Spacing.sm) {
            TablerIcon(.messagesOff, size: 40, color: AppTheme.Colors.textSecondary)
            AppText("chat.history.empty", table: "Chat", style: .subheadline)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var conversationList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(TimePeriod.allCases, id: \.self) { period in
                    let items = conversations(for: period)
                    if !items.isEmpty {
                        Section {
                            ForEach(items) { conversation in
                                Button {
                                    dismiss()
                                    onSelectConversation(conversation.id)
                                } label: {
                                    ChatHistoryRow(
                                        conversation: conversation,
                                        isActive: conversation.id == activeConversationId
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        } header: {
                            AppText(verbatim: period.label, style: .caption)
                                .weight(.semibold)
                                .padding(.horizontal, AppTheme.Spacing.md)
                                .padding(.top, AppTheme.Spacing.md)
                                .padding(.bottom, AppTheme.Spacing.xxs)
                        }
                    }
                }
            }
            .padding(.bottom, AppTheme.Spacing.md)
        }
    }

    private func conversations(for period: TimePeriod) -> [ConversationSummary] {
        let calendar = Calendar.current
        let now = Date()
        let startOfToday = calendar.startOfDay(for: now)

        return conversations.filter { conversation in
            let date = conversation.date
            switch period {
            case .today:
                return date >= startOfToday
            case .yesterday:
                let startOfYesterday = calendar.date(byAdding: .day, value: -1, to: startOfToday)!
                return date >= startOfYesterday && date < startOfToday
            case .week:
                let sevenDaysAgo = calendar.date(byAdding: .day, value: -7, to: startOfToday)!
                let startOfYesterday = calendar.date(byAdding: .day, value: -1, to: startOfToday)!
                return date >= sevenDaysAgo && date < startOfYesterday
            case .month:
                let thirtyDaysAgo = calendar.date(byAdding: .day, value: -30, to: startOfToday)!
                let sevenDaysAgo = calendar.date(byAdding: .day, value: -7, to: startOfToday)!
                return date >= thirtyDaysAgo && date < sevenDaysAgo
            case .older:
                let thirtyDaysAgo = calendar.date(byAdding: .day, value: -30, to: startOfToday)!
                return date < thirtyDaysAgo
            }
        }
    }

    private func dismiss() {
        withAnimation(.spring(duration: 0.3)) {
            dragOffset = 0
            isOpen = false
        }
    }
}
