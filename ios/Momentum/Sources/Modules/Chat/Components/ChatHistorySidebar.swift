import SwiftUI

struct ChatHistorySidebar: View {
    @Binding var isOpen: Bool
    let conversations: [ConversationSummary]
    let activeConversationId: String?
    let onSelectConversation: (String) -> Void
    let onNewConversation: () -> Void
    let onDeleteConversation: (String) -> Void

    @State private var dragOffset: CGFloat = 0

    var body: some View {
        ZStack(alignment: .leading) {
            if isOpen {
                Color("TextPrimary").opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture { dismiss() }
                    .transition(.opacity)

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
                    .transition(.move(edge: .leading))
            }
        }
        .allowsHitTesting(isOpen)
        .animation(.spring(duration: 0.3), value: isOpen)
    }

    private var panel: some View {
        GeometryReader { geometry in
            VStack(alignment: .leading, spacing: 8) {
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
        HStack(spacing: 12) {
            AppText("chat.history.title", table: "Chat", style: .headline)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button {
                dismiss()
                onNewConversation()
            } label: {
                TablerIcons(.edit, size: 20, color: Color("TextPrimary"))
                    .frame(width: 36, height: 36)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .accessibilityLabel(String(localized: "chat.history.new", table: "Chat"))
        }
        .padding(.horizontal, 8 + 16)
        .padding(.top, 64)
        .padding(.bottom, 4)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            TablerIcons(.messagesOff, size: 40, color: Color("TextSecondary"))
            AppText("chat.history.empty", table: "Chat", style: .subheadline)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var conversationList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(conversations) { conversation in
                    Button {
                        dismiss()
                        onSelectConversation(conversation.id)
                    } label: {
                        ChatHistoryRow(
                            conversation: conversation,
                            isActive: conversation.id == activeConversationId
                        )
                        .frame(maxWidth: .infinity)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button(role: .destructive) {
                            onDeleteConversation(conversation.id)
                        } label: {
                            HStack(spacing: 8) {
                                TablerIcons(.trash, size: 16, color: Color("StatusError"))
                                AppText("chat.history.delete", table: "Chat", style: .body)
                            }
                        }
                    }
                }
            }
            .padding(.bottom, 16)
        }
    }

    private func dismiss() {
        withAnimation(.spring(duration: 0.3)) {
            dragOffset = 0
            isOpen = false
        }
    }
}
